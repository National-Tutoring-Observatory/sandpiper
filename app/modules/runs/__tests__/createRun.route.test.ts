import { Types } from "mongoose";
import { beforeEach, describe, expect, it } from "vitest";
import { BillingPlanService } from "~/modules/billing/billingPlan";
import { TeamBillingService } from "~/modules/billing/teamBilling";
import { getAvailableProviders } from "~/modules/llm/modelRegistry";
import { ProjectService } from "~/modules/projects/project";
import { PromptService } from "~/modules/prompts/prompt";
import { PromptVersionService } from "~/modules/prompts/promptVersion";
import { SessionService } from "~/modules/sessions/session";
import "~/modules/teams/team";
import { TeamService } from "~/modules/teams/team";
import { UserService } from "~/modules/users/user";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import createTestRun from "../../../../test/helpers/createTestRun";
import loginUser from "../../../../test/helpers/loginUser";
import { action, loader } from "../containers/createRun.route";

const testModel = getAvailableProviders()[0].models[0].code;

describe("createRun.route action - CREATE_AND_START_RUN validation", () => {
  let cookieHeader: string;
  let teamId: string;
  let projectId: string;

  beforeEach(async () => {
    await clearDocumentDB();

    const user = await UserService.create({ username: "test_user", teams: [] });
    const team = await TeamService.create({ name: "Test Team" });
    teamId = team._id;
    await UserService.updateById(user._id, {
      teams: [{ team: team._id, role: "ADMIN" }],
    });
    const project = await ProjectService.create({
      name: "Test Project",
      createdBy: user._id,
      team: team._id,
    });
    projectId = project._id;
    cookieHeader = await loginUser(user._id);
  });

  const makeRequest = (payload: object) =>
    new Request("http://localhost/", {
      method: "POST",
      headers: { cookie: cookieHeader, "content-type": "application/json" },
      body: JSON.stringify({ intent: "CREATE_AND_START_RUN", payload }),
    });

  it("returns 403 when user does not belong to the project team", async () => {
    const otherUser = await UserService.create({
      username: "other_user",
      teams: [],
    });
    const otherCookie = await loginUser(otherUser._id);

    const res = await action({
      request: new Request("http://localhost/", {
        method: "POST",
        headers: { cookie: otherCookie, "content-type": "application/json" },
        body: JSON.stringify({
          intent: "CREATE_AND_START_RUN",
          payload: {
            name: "Valid Run Name",
            annotationType: "PER_UTTERANCE",
            prompt: new Types.ObjectId().toString(),
            promptVersion: 1,
            model: "gpt-4o",
            sessions: [new Types.ObjectId().toString()],
          },
        }),
      }),
      params: { teamId, projectId },
    } as any);

    expect((res as any).data.errors.project).toBeDefined();
  });

  it("returns errors when name is missing", async () => {
    const res = await action({
      request: makeRequest({
        annotationType: "PER_UTTERANCE",
        prompt: new Types.ObjectId().toString(),
        promptVersion: 1,
        model: "gpt-4o",
        sessions: [new Types.ObjectId().toString()],
      }),
      params: { teamId, projectId },
    } as any);

    expect((res as any).data.errors.name).toBeDefined();
  });

  it("returns errors when name is whitespace only", async () => {
    const res = await action({
      request: makeRequest({
        name: "   ",
        annotationType: "PER_UTTERANCE",
        prompt: new Types.ObjectId().toString(),
        promptVersion: 1,
        model: "gpt-4o",
        sessions: [new Types.ObjectId().toString()],
      }),
      params: { teamId, projectId },
    } as any);

    expect((res as any).data.errors.name).toBeDefined();
  });

  it("returns errors when name is shorter than 3 characters", async () => {
    const res = await action({
      request: makeRequest({
        name: "ab",
        annotationType: "PER_UTTERANCE",
        prompt: new Types.ObjectId().toString(),
        promptVersion: 1,
        model: "gpt-4o",
        sessions: [new Types.ObjectId().toString()],
      }),
      params: { teamId, projectId },
    } as any);

    expect((res as any).data.errors.name).toBeDefined();
  });

  it("returns errors when sessions are missing", async () => {
    const res = await action({
      request: makeRequest({
        name: "Valid Run Name",
        annotationType: "PER_UTTERANCE",
        prompt: new Types.ObjectId().toString(),
        promptVersion: 1,
        model: "gpt-4o",
        sessions: [],
      }),
      params: { teamId, projectId },
    } as any);

    expect((res as any).data.errors.sessions).toBeDefined();
  });

  it("returns errors when prompt is missing", async () => {
    const res = await action({
      request: makeRequest({
        name: "Valid Run Name",
        annotationType: "PER_UTTERANCE",
        promptVersion: 1,
        model: "gpt-4o",
        sessions: [new Types.ObjectId().toString()],
      }),
      params: { teamId, projectId },
    } as any);

    expect((res as any).data.errors.prompt).toBeDefined();
  });
});

describe("createRun.route loader", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  it("redirects to / when project not found", async () => {
    const team = await TeamService.create({ name: "Some Team" });
    const user = await UserService.create({
      username: "test_user",
      teams: [{ team: team._id, role: "ADMIN" }],
    });
    const cookieHeader = await loginUser(user._id);
    const fakeProjectId = new Types.ObjectId().toString();

    const res = await loader({
      request: new Request(
        `http://localhost/teams/${team._id}/projects/${fakeProjectId}/create-run`,
        { headers: { cookie: cookieHeader } },
      ),
      params: { teamId: team._id, projectId: fakeProjectId },
    } as any);

    expect(res).toBeInstanceOf(Response);
    expect((res as Response).headers.get("Location")).toBe("/");
  });

  it("redirects to / when user is not in project team", async () => {
    const owner = await UserService.create({ username: "owner", teams: [] });
    const otherUser = await UserService.create({
      username: "other_user",
      teams: [],
    });
    const team = await TeamService.create({ name: "Private Team" });

    await UserService.updateById(owner._id, {
      teams: [{ team: team._id, role: "ADMIN" }],
    });

    const project = await ProjectService.create({
      name: "Private Project",
      createdBy: owner._id,
      team: team._id,
    });

    const cookieHeader = await loginUser(otherUser._id);

    const res = await loader({
      request: new Request(
        `http://localhost/teams/${team._id}/projects/${project._id}/create-run`,
        { headers: { cookie: cookieHeader } },
      ),
      params: { teamId: team._id, projectId: project._id },
    } as any);

    expect(res).toBeInstanceOf(Response);
    expect((res as Response).headers.get("Location")).toBe("/");
  });

  it("returns project data for authorized users", async () => {
    const user = await UserService.create({ username: "test_user", teams: [] });
    const team = await TeamService.create({ name: "Test Team" });
    await UserService.updateById(user._id, {
      teams: [{ team: team._id, role: "ADMIN" }],
    });

    const project = await ProjectService.create({
      name: "Test Project",
      createdBy: user._id,
      team: team._id,
    });

    const cookieHeader = await loginUser(user._id);

    const res = await loader({
      request: new Request(
        `http://localhost/teams/${team._id}/projects/${project._id}/create-run`,
        { headers: { cookie: cookieHeader } },
      ),
      params: { teamId: team._id, projectId: project._id },
    } as any);

    expect(res).not.toBeInstanceOf(Response);
    const loaderData = res as any;
    // Ensure project is unwrapped, not { data: ... }
    expect(loaderData.project._id).toBe(project._id);
    expect(loaderData.project.name).toBe("Test Project");
    expect(loaderData.project.data).toBeUndefined();
  });

  it("does not expose run data when duplicateFrom belongs to a different project", async () => {
    const ownerUser = await UserService.create({
      username: "owner",
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
    const foreignRun = await createTestRun({
      project: projectA._id,
      name: "Foreign Run",
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
    const res = await loader({
      request: new Request(
        `http://localhost/teams/${teamB._id}/projects/${projectB._id}/create-run?duplicateFrom=${foreignRun._id}`,
        { headers: { cookie: cookieHeader } },
      ),
      params: { teamId: teamB._id, projectId: projectB._id },
    } as any);

    expect(res).not.toBeInstanceOf(Response);
    expect((res as any).initialRun).toBeNull();
  });
});

describe("createRun.route action - insufficient credits", () => {
  let cookieHeader: string;
  let teamId: string;
  let projectId: string;
  let sessionId: string;
  let promptId: string;

  beforeEach(async () => {
    await clearDocumentDB();

    const user = await UserService.create({ username: "test_user", teams: [] });
    const team = await TeamService.create({ name: "Test Team" });
    teamId = team._id;
    await UserService.updateById(user._id, {
      teams: [{ team: team._id, role: "ADMIN" }],
    });
    const project = await ProjectService.create({
      name: "Test Project",
      createdBy: user._id,
      team: team._id,
    });
    projectId = project._id;

    const session = await SessionService.create({
      name: "Test Session",
      project: project._id,
    });
    sessionId = session._id;

    const prompt = await PromptService.create({
      name: "Test Prompt",
      annotationType: "PER_UTTERANCE",
    });
    promptId = prompt._id;
    await PromptVersionService.create({
      prompt: prompt._id,
      version: 1,
      userPrompt: "Test content",
      annotationSchema: [],
    });

    await BillingPlanService.create({
      name: "Default",
      markupRate: 1.5,
      isDefault: true,
    });
    await TeamBillingService.setupTeamBilling(team._id);

    cookieHeader = await loginUser(user._id);
  });

  it("returns 402 when estimated cost exceeds balance", async () => {
    const res = await action({
      request: new Request("http://localhost/", {
        method: "POST",
        headers: { cookie: cookieHeader, "content-type": "application/json" },
        body: JSON.stringify({
          intent: "CREATE_AND_START_RUN",
          payload: {
            name: "Valid Run Name",
            annotationType: "PER_UTTERANCE",
            prompt: promptId,
            promptVersion: 1,
            model: testModel,
            sessions: [sessionId],
          },
        }),
      }),
      params: { teamId, projectId },
    } as any);

    expect((res as any).init?.status).toBe(402);
    expect((res as any).data.errors.credits).toBeDefined();
  });
});
