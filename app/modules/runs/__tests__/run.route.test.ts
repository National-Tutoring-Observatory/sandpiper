import { Types } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectService } from "~/modules/projects/project";
import { RunService } from "~/modules/runs/run";
import { RunSetService } from "~/modules/runSets/runSet";
import "~/modules/teams/team";
import { TeamService } from "~/modules/teams/team";
import { UserService } from "~/modules/users/user";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import expectAuthRequired from "../../../../test/helpers/expectAuthRequired";
import loginUser from "../../../../test/helpers/loginUser";
import { action, loader } from "../containers/run.route";

vi.mock("~/modules/runs/helpers/buildRunSessions.server", () => ({
  default: vi.fn(async (sessionIds: string[]) =>
    sessionIds.map((id) => ({
      sessionId: id,
      name: "Mock Session",
      fileType: "",
      status: "RUNNING",
      startedAt: new Date(),
      finishedAt: new Date(),
    })),
  ),
}));

vi.mock("~/modules/runs/services/buildRunSnapshot.server", () => ({
  default: vi.fn(async ({ promptVersionNumber, modelCode }: any) => ({
    prompt: {
      name: "Mock Prompt",
      userPrompt: "Mock",
      annotationSchema: [],
      annotationType: "PER_UTTERANCE",
      version: promptVersionNumber,
      systemPrompt: "Mock annotation system prompt",
      verifySystemPrompt: "",
      adjudicateSystemPrompt: "",
    },
    model: { code: modelCode, provider: "openai", name: modelCode },
  })),
  buildRunSnapshot: vi.fn(),
}));

vi.mock("~/modules/runs/services/createRunAnnotations.server", () => ({
  default: vi.fn(async () => {}),
}));

describe("run.route loader", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  it("redirects to / when run not found", async () => {
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
    const fakeRunId = new Types.ObjectId().toString();

    const res = await loader({
      request: new Request(
        `http://localhost/teams/${team._id}/projects/${project._id}/runs/${fakeRunId}`,
        { headers: { cookie: cookieHeader } },
      ),
      params: {
        teamId: team._id,
        projectId: project._id,
        runId: fakeRunId,
      },
    } as any);

    expect(res).toBeInstanceOf(Response);
    expect((res as Response).headers.get("Location")).toBe("/");
  });

  it("returns run data with promptInfo from snapshot", async () => {
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

    const run = await RunService.create({
      project: project._id,
      name: "Test Run",
      sessions: [],
      annotationType: "PER_UTTERANCE",
      prompt: new Types.ObjectId().toString(),
      promptVersion: 1,
      modelCode: "gpt-4",
      shouldRunVerification: false,
      createdBy: new Types.ObjectId().toString(),
    });

    const cookieHeader = await loginUser(user._id);

    const res = await loader({
      request: new Request(
        `http://localhost/teams/${team._id}/projects/${project._id}/runs/${run._id}`,
        { headers: { cookie: cookieHeader } },
      ),
      params: {
        teamId: team._id,
        projectId: project._id,
        runId: run._id,
      },
    } as any);

    expect(res).not.toBeInstanceOf(Response);
    const loaderData = res as any;
    expect(loaderData.promptInfo).toBeDefined();
    expect(loaderData.promptInfo.name).toBe("Mock Prompt");
    expect(loaderData.promptInfo.version).toBe(1);
  });

  it("returns paginated sessions", async () => {
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

    const sessionIds = Array.from({ length: 25 }, () =>
      new Types.ObjectId().toString(),
    );

    const run = await RunService.create({
      project: project._id,
      name: "Test Run",
      sessions: sessionIds,
      annotationType: "PER_UTTERANCE",
      prompt: new Types.ObjectId().toString(),
      promptVersion: 1,
      modelCode: "gpt-4",
      shouldRunVerification: false,
      createdBy: new Types.ObjectId().toString(),
    });

    const cookieHeader = await loginUser(user._id);

    const res = await loader({
      request: new Request(
        `http://localhost/teams/${team._id}/projects/${project._id}/runs/${run._id}`,
        { headers: { cookie: cookieHeader } },
      ),
      params: {
        teamId: team._id,
        projectId: project._id,
        runId: run._id,
      },
    } as any);

    const loaderData = res as any;
    expect(loaderData.paginatedSessions).toBeDefined();
    expect(loaderData.paginatedSessions.data).toHaveLength(20);
    expect(loaderData.paginatedSessions.count).toBe(25);
    expect(loaderData.paginatedSessions.totalPages).toBe(2);
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

    const run = await RunService.create({
      project: project._id,
      name: "Test Run",
      sessions: [],
      annotationType: "PER_UTTERANCE",
      prompt: new Types.ObjectId().toString(),
      promptVersion: 1,
      modelCode: "gpt-4",
      shouldRunVerification: false,
      createdBy: new Types.ObjectId().toString(),
    });

    const cookieHeader = await loginUser(otherUser._id);

    const res = await loader({
      request: new Request(
        `http://localhost/teams/${team._id}/projects/${project._id}/runs/${run._id}`,
        { headers: { cookie: cookieHeader } },
      ),
      params: {
        teamId: team._id,
        projectId: project._id,
        runId: run._id,
      },
    } as any);

    expect(res).toBeInstanceOf(Response);
    expect((res as Response).headers.get("Location")).toBe("/");
  });

  it("does not leak a runSet belonging to a different project", async () => {
    const user = await UserService.create({ username: "user", teams: [] });
    const team = await TeamService.create({ name: "Team" });
    await UserService.updateById(user._id, {
      teams: [{ team: team._id, role: "ADMIN" }],
    });

    const projectA = await ProjectService.create({
      name: "Project A",
      createdBy: user._id,
      team: team._id,
    });
    const projectB = await ProjectService.create({
      name: "Project B",
      createdBy: user._id,
      team: team._id,
    });

    const run = await RunService.create({
      project: projectA._id,
      name: "Run",
      sessions: [],
      annotationType: "PER_UTTERANCE",
      prompt: new Types.ObjectId().toString(),
      promptVersion: 1,
      modelCode: "gpt-4",
      shouldRunVerification: false,
      createdBy: new Types.ObjectId().toString(),
    });

    const runSetInProjectB = await RunSetService.create({
      name: "RunSet in B",
      project: projectB._id,
      annotationType: "PER_UTTERANCE",
    });

    const cookieHeader = await loginUser(user._id);

    const res = await loader({
      request: new Request(
        `http://localhost/teams/${team._id}/projects/${projectA._id}/run-sets/${runSetInProjectB._id}/runs/${run._id}`,
        { headers: { cookie: cookieHeader } },
      ),
      params: {
        teamId: team._id,
        projectId: projectA._id,
        runId: run._id,
        runSetId: runSetInProjectB._id,
      },
    } as any);

    const loaderData = res as any;
    expect(loaderData.runSet).toBeNull();
  });
});

describe("run.route action", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  it("redirects to / when unauthenticated", async () => {
    const owner = await UserService.create({ username: "owner", teams: [] });
    const team = await TeamService.create({ name: "Test Team" });
    await UserService.updateById(owner._id, {
      teams: [{ team: team._id, role: "ADMIN" }],
    });
    const project = await ProjectService.create({
      name: "Test Project",
      createdBy: owner._id,
      team: team._id,
    });
    const run = await RunService.create({
      project: project._id,
      name: "Test Run",
      sessions: [],
      annotationType: "PER_UTTERANCE",
      prompt: new Types.ObjectId().toString(),
      promptVersion: 1,
      modelCode: "gpt-4",
      shouldRunVerification: false,
      createdBy: new Types.ObjectId().toString(),
    });

    await expectAuthRequired(() =>
      action({
        request: new Request(
          `http://localhost/teams/${team._id}/projects/${project._id}/runs/${run._id}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ intent: "DELETE_RUN", payload: {} }),
          },
        ),
        params: {
          teamId: team._id,
          projectId: project._id,
          runId: run._id,
        },
      } as any),
    );
  });

  it("redirects to / when user is not in project team", async () => {
    const owner = await UserService.create({ username: "owner", teams: [] });
    const team = await TeamService.create({ name: "Private Team" });
    await UserService.updateById(owner._id, {
      teams: [{ team: team._id, role: "ADMIN" }],
    });
    const project = await ProjectService.create({
      name: "Private Project",
      createdBy: owner._id,
      team: team._id,
    });
    const run = await RunService.create({
      project: project._id,
      name: "Private Run",
      sessions: [],
      annotationType: "PER_UTTERANCE",
      prompt: new Types.ObjectId().toString(),
      promptVersion: 1,
      modelCode: "gpt-4",
      shouldRunVerification: false,
      createdBy: new Types.ObjectId().toString(),
    });

    const otherUser = await UserService.create({
      username: "other_user",
      teams: [],
    });
    const cookieHeader = await loginUser(otherUser._id);

    const res = await action({
      request: new Request(
        `http://localhost/teams/${team._id}/projects/${project._id}/runs/${run._id}`,
        {
          method: "POST",
          headers: { cookie: cookieHeader, "Content-Type": "application/json" },
          body: JSON.stringify({ intent: "DELETE_RUN", payload: {} }),
        },
      ),
      params: {
        teamId: team._id,
        projectId: project._id,
        runId: run._id,
      },
    } as any);

    expect(res).toBeInstanceOf(Response);
    expect((res as Response).headers.get("Location")).toBe("/");
  });

  it("GET_ALL_RUN_SETS returns all run sets containing the run", async () => {
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

    const run = await RunService.create({
      project: project._id,
      name: "Test Run",
      sessions: [],
      annotationType: "PER_UTTERANCE",
      prompt: new Types.ObjectId().toString(),
      promptVersion: 1,
      modelCode: "gpt-4",
      shouldRunVerification: false,
      createdBy: new Types.ObjectId().toString(),
    });

    const runSet = await RunSetService.create({
      name: "Test Run Set",
      project: project._id,
      runs: [run._id],
      annotationType: "PER_UTTERANCE",
    });

    const cookieHeader = await loginUser(user._id);

    const res = await action({
      request: new Request(
        `http://localhost/teams/${team._id}/projects/${project._id}/runs/${run._id}`,
        {
          method: "POST",
          headers: { cookie: cookieHeader, "Content-Type": "application/json" },
          body: JSON.stringify({ intent: "GET_ALL_RUN_SETS" }),
        },
      ),
      params: {
        teamId: team._id,
        projectId: project._id,
        runId: run._id,
      },
    } as any);

    const data = res as any;
    expect(data.runSets).toHaveLength(1);
    expect(data.runSets[0]._id).toBe(runSet._id);
  });

  it("UPDATE_RUN updates run name", async () => {
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

    const run = await RunService.create({
      project: project._id,
      name: "Old Name",
      sessions: [],
      annotationType: "PER_UTTERANCE",
      prompt: new Types.ObjectId().toString(),
      promptVersion: 1,
      modelCode: "gpt-4",
      shouldRunVerification: false,
      createdBy: new Types.ObjectId().toString(),
    });

    const cookieHeader = await loginUser(user._id);

    const res = await action({
      request: new Request(
        `http://localhost/teams/${team._id}/projects/${project._id}/runs/${run._id}`,
        {
          method: "PUT",
          headers: { cookie: cookieHeader, "Content-Type": "application/json" },
          body: JSON.stringify({
            intent: "UPDATE_RUN",
            payload: { name: "New Name" },
          }),
        },
      ),
      params: {
        teamId: team._id,
        projectId: project._id,
        runId: run._id,
      },
    } as any);

    const data = res as any;
    expect(data.success).toBe(true);
    expect(data.intent).toBe("UPDATE_RUN");
    const updatedRun = await RunService.findById(run._id);
    expect(updatedRun?.name).toBe("New Name");
  });

  it("DELETE_RUN deletes the run", async () => {
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

    const run = await RunService.create({
      project: project._id,
      name: "Delete Run",
      sessions: [],
      annotationType: "PER_UTTERANCE",
      prompt: new Types.ObjectId().toString(),
      promptVersion: 1,
      modelCode: "gpt-4",
      shouldRunVerification: false,
      createdBy: new Types.ObjectId().toString(),
    });

    const cookieHeader = await loginUser(user._id);

    const res = await action({
      request: new Request(
        `http://localhost/teams/${team._id}/projects/${project._id}/runs/${run._id}`,
        {
          method: "DELETE",
          headers: { cookie: cookieHeader, "Content-Type": "application/json" },
          body: JSON.stringify({ intent: "DELETE_RUN", payload: {} }),
        },
      ),
      params: {
        teamId: team._id,
        projectId: project._id,
        runId: run._id,
      },
    } as any);

    const data = res as any;
    expect(data.success).toBe(true);
    expect(data.intent).toBe("DELETE_RUN");

    const deletedRun = await RunService.findById(run._id);
    expect(deletedRun).toBeNull();
  });
});

describe("run.route action - IDOR protection", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  it("UPDATE_RUN throws when run belongs to a different project", async () => {
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
    const victimRun = await RunService.create({
      project: projectA._id,
      name: "Original Name",
      sessions: [],
      annotationType: "PER_UTTERANCE",
      prompt: new Types.ObjectId().toString(),
      promptVersion: 1,
      modelCode: "gpt-4",
      shouldRunVerification: false,
      createdBy: new Types.ObjectId().toString(),
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
      headers: { cookie: cookieHeader, "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "UPDATE_RUN",
        payload: { name: "Hacked Name" },
      }),
    });

    await expect(
      action({
        request: req,
        params: {
          teamId: teamB._id,
          projectId: projectB._id,
          runId: victimRun._id,
        },
      } as any),
    ).rejects.toThrow("Run not found");
    const unchanged = await RunService.findById(victimRun._id);
    expect(unchanged?.name).toBe("Original Name");
  });

  it("DELETE_RUN throws when run belongs to a different project", async () => {
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
    const victimRun = await RunService.create({
      project: projectA._id,
      name: "Victim Run",
      sessions: [],
      annotationType: "PER_UTTERANCE",
      prompt: new Types.ObjectId().toString(),
      promptVersion: 1,
      modelCode: "gpt-4",
      shouldRunVerification: false,
      createdBy: new Types.ObjectId().toString(),
    });

    const attacker = await UserService.create({
      username: "attacker2",
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
      headers: { cookie: cookieHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ intent: "DELETE_RUN", payload: {} }),
    });

    await expect(
      action({
        request: req,
        params: {
          teamId: teamB._id,
          projectId: projectB._id,
          runId: victimRun._id,
        },
      } as any),
    ).rejects.toThrow("Run not found");
    const stillExists = await RunService.findById(victimRun._id);
    expect(stillExists).not.toBeNull();
  });
});
