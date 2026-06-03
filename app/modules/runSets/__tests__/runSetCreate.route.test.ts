import { Types } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BillingPlanService } from "~/modules/billing/billingPlan";
import { TeamBillingService } from "~/modules/billing/teamBilling";
import { getAvailableProviders } from "~/modules/llm/modelRegistry";
import { ProjectService } from "~/modules/projects/project";
import type { Project } from "~/modules/projects/projects.types";
import { PromptService } from "~/modules/prompts/prompt";
import { PromptVersionService } from "~/modules/prompts/promptVersion";
import type { Prompt } from "~/modules/prompts/prompts.types";
import { buildUsedPromptModelKey } from "~/modules/runSets/helpers/getUsedPromptModels";
import { RunSetService } from "~/modules/runSets/runSet";
import { SessionService } from "~/modules/sessions/session";
import type { Session } from "~/modules/sessions/sessions.types";
import { TeamService } from "~/modules/teams/team";
import type { Team } from "~/modules/teams/teams.types";
import { UserService } from "~/modules/users/user";
import type { User } from "~/modules/users/users.types";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import expectAuthRequired from "../../../../test/helpers/expectAuthRequired";
import loginUser from "../../../../test/helpers/loginUser";
import { action, loader } from "../containers/runSetCreate.route";

const testModel = getAvailableProviders()[0].models[0].code;

vi.mock("~/modules/runs/services/createRunAnnotations.server", () => ({
  default: vi.fn(async () => {}),
}));

describe("runSetCreate.route", () => {
  let user: User;
  let team: Team;
  let project: Project;
  let session: Session;
  let prompt: Prompt;
  let cookieHeader: string;

  beforeEach(async () => {
    await clearDocumentDB();

    user = await UserService.create({
      username: "test_user",
      teams: [],
    });
    team = await TeamService.create({ name: "Test Team" });
    await UserService.updateById(user._id, {
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
      team: team._id,
    });
    await PromptVersionService.create({
      prompt: prompt._id,
      version: 1,
      userPrompt: "Test prompt content",
      annotationSchema: [],
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
          params: { teamId: team._id, projectId: project._id },
          unstable_pattern: "",
          context: {},
        } as any),
      );
    });

    it("redirects to / when project not found", async () => {
      const fakeId = new Types.ObjectId().toString();
      const res = await loader({
        request: new Request("http://localhost/", {
          headers: { cookie: cookieHeader },
        }),
        params: { teamId: team._id, projectId: fakeId },
        unstable_pattern: "",
        context: {},
      } as any);

      expect(res).toBeInstanceOf(Response);
      expect((res as Response).headers.get("Location")).toBe("/");
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
        params: { teamId: team._id, projectId: project._id },
        unstable_pattern: "",
        context: {},
      } as any);

      expect(res).toBeInstanceOf(Response);
      expect((res as Response).headers.get("Location")).toBe("/");
    });

    it("returns project for authenticated user with view access", async () => {
      const res = await loader({
        request: new Request("http://localhost/", {
          headers: { cookie: cookieHeader },
        }),
        params: { teamId: team._id, projectId: project._id },
        unstable_pattern: "",
        context: {},
      } as any);

      expect(res).not.toBeInstanceOf(Response);
      const data = res as { project: Project };
      expect(data.project._id).toBe(project._id);
      expect(data.project.name).toBe("Test Project");
    });
  });

  describe("action - CREATE_RUN_SET", () => {
    it("successfully creates runSet", async () => {
      const body = JSON.stringify({
        intent: "CREATE_RUN_SET",
        payload: {
          name: "Test Run Set",
          annotationType: "PER_UTTERANCE",
          definitions: [
            {
              key: buildUsedPromptModelKey(prompt._id, 1, testModel),
              prompt: {
                promptId: prompt._id,
                promptName: "Prompt 1",
                version: 1,
              },
              modelCode: testModel,
            },
          ],
          sessions: [session._id],
        },
      });

      const res = await action({
        request: new Request("http://localhost/", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body,
        }),
        params: { teamId: team._id, projectId: project._id },
        context: {},
      } as any);

      expect(res).not.toBeInstanceOf(Response);
      const result = res as {
        intent: string;
        data: { runSetId: string; projectId: string; errors: string[] };
      };
      expect(result.intent).toBe("CREATE_RUN_SET");
      expect(result.data.runSetId).toBeDefined();
      expect(result.data.projectId).toBe(project._id);

      const runSet = await RunSetService.findById(result.data.runSetId);
      expect(runSet?.name).toBe("Test Run Set");
      expect(runSet?.sessions).toEqual([session._id]);
    });

    it("returns 402 when estimated cost exceeds balance", async () => {
      vi.spyOn(TeamBillingService, "getBalance").mockResolvedValueOnce(0);

      const body = JSON.stringify({
        intent: "CREATE_RUN_SET",
        payload: {
          name: "Test Run Set",
          annotationType: "PER_UTTERANCE",
          definitions: [
            {
              key: buildUsedPromptModelKey(prompt._id, 1, testModel),
              prompt: {
                promptId: prompt._id,
                promptName: "Prompt 1",
                version: 1,
              },
              modelCode: testModel,
            },
          ],
          sessions: [session._id],
        },
      });

      const res = await action({
        request: new Request("http://localhost/", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body,
        }),
        params: { teamId: team._id, projectId: project._id },
        context: {},
      } as any);

      expect((res as any).init?.status).toBe(402);
      expect((res as any).data.errors.credits).toBeDefined();
    });

    it("returns unauthenticated when no user session", async () => {
      const body = JSON.stringify({
        intent: "CREATE_RUN_SET",
        payload: {
          name: "Test Run Set",
          annotationType: "PER_UTTERANCE",
          definitions: [
            {
              key: buildUsedPromptModelKey(prompt._id, 1, testModel),
              prompt: { promptId: prompt._id, promptName: "", version: 1 },
              modelCode: testModel,
            },
          ],
          sessions: [session._id],
        },
      });

      await expectAuthRequired(() =>
        action({
          request: new Request("http://localhost/", {
            method: "POST",
            body,
          }),
          params: { teamId: team._id, projectId: project._id },
          context: {},
        } as any),
      );
    });

    it("rejects a prompt that belongs to a different team (IDOR)", async () => {
      const teamB = await TeamService.create({ name: "Team B" });
      await UserService.updateById(user._id, {
        teams: [
          { team: team._id, role: "ADMIN" },
          { team: teamB._id, role: "ADMIN" },
        ],
      });
      const promptInB = await PromptService.create({
        name: "Foreign Prompt",
        annotationType: "PER_UTTERANCE",
        team: teamB._id,
      });
      await PromptVersionService.create({
        prompt: promptInB._id,
        version: 1,
        userPrompt: "leaked",
        annotationSchema: [],
      });

      const body = JSON.stringify({
        intent: "CREATE_RUN_SET",
        payload: {
          name: "Crafted",
          annotationType: "PER_UTTERANCE",
          definitions: [
            {
              key: buildUsedPromptModelKey(promptInB._id, 1, testModel),
              modelCode: testModel,
              prompt: {
                promptId: promptInB._id,
                promptName: "Foreign Prompt",
                version: 1,
              },
            },
          ],
          sessions: [session._id],
        },
      });

      const res = (await action({
        request: new Request("http://localhost/", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body,
        }),
        params: { teamId: team._id, projectId: project._id },
        context: {},
      } as any)) as any;

      expect(res.init?.status).toBe(404);
      expect(res.data.errors.definitions).toBeDefined();
    });
  });
});
