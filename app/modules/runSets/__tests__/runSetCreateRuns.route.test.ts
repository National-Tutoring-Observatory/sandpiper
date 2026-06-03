import { beforeEach, describe, expect, it, vi } from "vitest";
import { BillingPlanService } from "~/modules/billing/billingPlan";
import { TeamBillingService } from "~/modules/billing/teamBilling";
import { getAvailableProviders } from "~/modules/llm/modelRegistry";
import { ProjectService } from "~/modules/projects/project";
import type { Project } from "~/modules/projects/projects.types";
import { PromptService } from "~/modules/prompts/prompt";
import { PromptVersionService } from "~/modules/prompts/promptVersion";
import type { Prompt } from "~/modules/prompts/prompts.types";
import { SessionService } from "~/modules/sessions/session";
import type { Session } from "~/modules/sessions/sessions.types";
import { TeamService } from "~/modules/teams/team";
import type { Team } from "~/modules/teams/teams.types";
import { UserService } from "~/modules/users/user";
import type { User } from "~/modules/users/users.types";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import expectAuthRequired from "../../../../test/helpers/expectAuthRequired";
import loginUser from "../../../../test/helpers/loginUser";
import { action, loader } from "../containers/runSetCreateRuns.route";
import { buildUsedPromptModelKey } from "../helpers/getUsedPromptModels";
import { RunSetService } from "../runSet";
import type { RunSet } from "../runSets.types";

const testModel = getAvailableProviders()[0].models[0].code;

vi.mock("~/modules/runs/services/createRunAnnotations.server", () => ({
  default: vi.fn(async () => {}),
}));

describe("runSetCreateRuns.route", () => {
  let user: User;
  let team: Team;
  let project: Project;
  let session: Session;
  let prompt: Prompt;
  let runSet: RunSet;
  let cookieHeader: string;

  beforeEach(async () => {
    await clearDocumentDB();

    team = await TeamService.create({ name: "Test Team" });
    user = await UserService.create({
      username: "test_user",
      teams: [{ team: team._id, role: "ADMIN" }],
    });
    project = await ProjectService.create({
      name: "Test Project",
      createdBy: user._id,
      team: team._id,
    });
    session = await SessionService.create({
      name: "Test Session",
      project: project._id,
    });
    prompt = await PromptService.create({
      name: "Test Prompt",
      annotationType: "PER_UTTERANCE",
    });
    await PromptVersionService.create({
      prompt: prompt._id,
      version: 1,
      userPrompt: "Test prompt content",
      annotationSchema: [],
    });
    runSet = await RunSetService.create({
      name: "Test Run Set",
      project: project._id,
      sessions: [session._id],
      runs: [],
      annotationType: "PER_UTTERANCE",
    });

    await BillingPlanService.create({
      name: "Default",
      markupRate: 1.5,
      isDefault: true,
    });
    await TeamBillingService.setupTeamBilling(team._id);
    await TeamBillingService.assignInitialCredits(team._id, user._id);

    cookieHeader = await loginUser(user._id);
  });

  describe("loader", () => {
    it("redirects to / when there is no session", async () => {
      await expectAuthRequired(() =>
        loader({
          request: new Request("http://localhost/"),
          params: {
            teamId: team._id,
            projectId: project._id,
            runSetId: runSet._id,
          },
        } as any),
      );
    });

    it("redirects to / when user cannot view project", async () => {
      const otherUser = await UserService.create({
        username: "other_user",
        teams: [],
      });
      const otherCookie = await loginUser(otherUser._id);

      const res = await loader({
        request: new Request("http://localhost/", {
          headers: { cookie: otherCookie },
        }),
        params: {
          teamId: team._id,
          projectId: project._id,
          runSetId: runSet._id,
        },
      } as any);

      expect(res).toBeInstanceOf(Response);
      expect((res as Response).headers.get("Location")).toBe("/");
    });

    it("returns runSet, project, and usedPromptModels", async () => {
      const res = await loader({
        request: new Request("http://localhost/", {
          headers: { cookie: cookieHeader },
        }),
        params: {
          teamId: team._id,
          projectId: project._id,
          runSetId: runSet._id,
        },
      } as any);

      expect(res).not.toBeInstanceOf(Response);
      const data = res as any;
      expect(data.runSet._id).toBe(runSet._id);
      expect(data.project._id).toBe(project._id);
      expect(Array.isArray(data.usedPromptModels)).toBe(true);
      expect(data.usedPromptModels).toHaveLength(0);
    });
  });

  describe("loader - IDOR protection", () => {
    it("redirects to run-sets when runSet belongs to a different project", async () => {
      const ownerUser = await UserService.create({
        username: "owner_idor",
        teams: [],
      });
      const teamA = await TeamService.create({ name: "Team A" });
      await UserService.updateById(ownerUser._id, {
        teams: [{ team: teamA._id, role: "ADMIN" }],
      });
      const projectA = await ProjectService.create({
        name: "Project A",
        createdBy: ownerUser._id,
        team: teamA._id,
      });
      const victimRunSet = await RunSetService.create({
        name: "Victim Run Set",
        project: projectA._id,
        sessions: [],
        runs: [],
        annotationType: "PER_UTTERANCE",
      });

      const attacker = await UserService.create({
        username: "attacker_idor",
        teams: [],
      });
      const teamB = await TeamService.create({ name: "Team B" });
      await UserService.updateById(attacker._id, {
        teams: [{ team: teamB._id, role: "ADMIN" }],
      });
      const projectB = await ProjectService.create({
        name: "Project B",
        createdBy: attacker._id,
        team: teamB._id,
      });

      const attackerCookie = await loginUser(attacker._id);
      const res = await loader({
        request: new Request("http://localhost/", {
          headers: { cookie: attackerCookie },
        }),
        params: {
          teamId: teamB._id,
          projectId: projectB._id,
          runSetId: victimRunSet._id,
        },
      } as any);

      expect(res).toBeInstanceOf(Response);
      expect((res as Response).headers.get("Location")).toBe(
        `/teams/${teamB._id}/projects/${projectB._id}/run-sets`,
      );
    });
  });

  describe("action - CREATE_RUNS", () => {
    it("returns 403 when user cannot manage runs", async () => {
      const otherUser = await UserService.create({
        username: "other_user",
        teams: [],
      });
      const otherCookie = await loginUser(otherUser._id);

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { cookie: otherCookie, "content-type": "application/json" },
        body: JSON.stringify({
          intent: "CREATE_RUNS",
          payload: {
            definitions: [
              {
                key: buildUsedPromptModelKey(prompt._id, 1, testModel),
                prompt: {
                  promptId: prompt._id,
                  promptName: "Test Prompt",
                  version: 1,
                },
                modelCode: testModel,
              },
            ],
          },
        }),
      });

      const resp = (await action({
        request: req,
        params: {
          teamId: team._id,
          projectId: project._id,
          runSetId: runSet._id,
        },
      } as any)) as any;

      expect(resp.init?.status).toBe(403);
    });

    it("returns 400 when definitions array is empty", async () => {
      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { cookie: cookieHeader, "content-type": "application/json" },
        body: JSON.stringify({
          intent: "CREATE_RUNS",
          payload: {
            definitions: [],
          },
        }),
      });

      const resp = (await action({
        request: req,
        params: {
          teamId: team._id,
          projectId: project._id,
          runSetId: runSet._id,
        },
      } as any)) as any;

      expect(resp.init?.status).toBe(400);
    });

    it("successfully creates runs and returns intent + data", async () => {
      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { cookie: cookieHeader, "content-type": "application/json" },
        body: JSON.stringify({
          intent: "CREATE_RUNS",
          payload: {
            definitions: [
              {
                key: buildUsedPromptModelKey(prompt._id, 1, testModel),
                prompt: {
                  promptId: prompt._id,
                  promptName: "Test Prompt",
                  version: 1,
                },
                modelCode: testModel,
              },
            ],
          },
        }),
      });

      const res = await action({
        request: req,
        params: {
          teamId: team._id,
          projectId: project._id,
          runSetId: runSet._id,
        },
      } as any);

      expect(res).not.toBeInstanceOf(Response);
      const result = res as any;
      expect(result.intent).toBe("CREATE_RUNS");
      expect(result.data.runSetId).toBe(runSet._id);
      expect(result.data.projectId).toBe(project._id);
      expect(result.data.createdCount).toBe(1);

      const updatedRunSet = await RunSetService.findById(runSet._id);
      expect(updatedRunSet!.runs!.length).toBe(1);
    });

    it("returns 402 when estimated cost exceeds balance", async () => {
      vi.spyOn(TeamBillingService, "getBalance").mockResolvedValueOnce(0);

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { cookie: cookieHeader, "content-type": "application/json" },
        body: JSON.stringify({
          intent: "CREATE_RUNS",
          payload: {
            definitions: [
              {
                key: buildUsedPromptModelKey(prompt._id, 1, testModel),
                prompt: {
                  promptId: prompt._id,
                  promptName: "Test Prompt",
                  version: 1,
                },
                modelCode: testModel,
              },
            ],
          },
        }),
      });

      const res = await action({
        request: req,
        params: {
          teamId: team._id,
          projectId: project._id,
          runSetId: runSet._id,
        },
      } as any);

      expect((res as any).init?.status).toBe(402);
      expect((res as any).data.errors.credits).toBeDefined();
    });

    it("returns 404 when runSet belongs to a different project", async () => {
      const ownerUser = await UserService.create({
        username: "owner2",
        teams: [],
      });
      const teamA = await TeamService.create({ name: "Team A" });
      await UserService.updateById(ownerUser._id, {
        teams: [{ team: teamA._id, role: "ADMIN" }],
      });
      const projectA = await ProjectService.create({
        name: "Project A",
        createdBy: ownerUser._id,
        team: teamA._id,
      });
      const victimRunSet = await RunSetService.create({
        name: "Victim Run Set",
        project: projectA._id,
        sessions: [],
        runs: [],
        annotationType: "PER_UTTERANCE",
      });

      const attacker = await UserService.create({
        username: "attacker",
        teams: [],
      });
      const teamB = await TeamService.create({ name: "Team B" });
      await UserService.updateById(attacker._id, {
        teams: [{ team: teamB._id, role: "ADMIN" }],
      });
      const projectB = await ProjectService.create({
        name: "Project B",
        createdBy: attacker._id,
        team: teamB._id,
      });

      const cookieHeader = await loginUser(attacker._id);
      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { cookie: cookieHeader, "content-type": "application/json" },
        body: JSON.stringify({
          intent: "CREATE_RUNS",
          payload: {
            definitions: [
              {
                key: "any",
                prompt: { promptId: "id", version: 1 },
                modelCode: "gpt-4",
              },
            ],
          },
        }),
      });

      const resp = (await action({
        request: req,
        params: {
          teamId: teamB._id,
          projectId: projectB._id,
          runSetId: victimRunSet._id,
        },
      } as any)) as any;
      expect(resp.init?.status).toBe(404);
      const unchanged = await RunSetService.findById(victimRunSet._id);
      expect(unchanged!.runs).toHaveLength(0);
    });
  });
});
