import { Types } from "mongoose";
import { beforeEach, describe, expect, it } from "vitest";
import { ProjectService } from "~/modules/projects/project";
import { RunSetService } from "~/modules/runSets/runSet";
import { SessionService } from "~/modules/sessions/session";
import { TeamService } from "~/modules/teams/team";
import { UserService } from "~/modules/users/user";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import createTestRun from "../../../../test/helpers/createTestRun";
import expectAuthRequired from "../../../../test/helpers/expectAuthRequired";
import loginUser from "../../../../test/helpers/loginUser";
import { action, loader } from "../containers/runSetAddRuns.route";

beforeEach(async () => {
  await clearDocumentDB();
});

describe("runSetAddRuns.route loader", () => {
  it("redirects to / when there is no session", async () => {
    await expectAuthRequired(() =>
      loader({
        request: new Request("http://localhost/"),
        params: { teamId: "any", projectId: "any", runSetId: "any" },
      } as any),
    );
  });

  it("redirects to / when project not found", async () => {
    const team = await TeamService.create({ name: "Test Team" });
    const user = await UserService.create({
      username: "test_user",
      teams: [{ team: team._id, role: "ADMIN" }],
    });
    const cookieHeader = await loginUser(user._id);

    const res = await loader({
      request: new Request("http://localhost/", {
        headers: { cookie: cookieHeader },
      }),
      params: {
        teamId: team._id,
        projectId: new Types.ObjectId().toString(),
        runSetId: "any",
      },
    } as any);

    expect(res).toBeInstanceOf(Response);
    expect((res as Response).headers.get("Location")).toBe("/");
  });

  it("returns eligible runs for runSet", async () => {
    const user = await UserService.create({
      username: "test_user",
      teams: [],
    });
    const team = await TeamService.create({ name: "Test Team" });
    await UserService.updateById(user._id, {
      teams: [{ team: team._id, role: "ADMIN" }],
    });
    const project = await ProjectService.create({
      name: "Test Project",
      createdBy: user._id,
      team: team._id,
    });
    const session = await SessionService.create({
      name: "Test Session",
      project: project._id,
    });
    const runSet = await RunSetService.create({
      name: "Test Run Set",
      project: project._id,
      sessions: [session._id],
      runs: [],
      annotationType: "PER_UTTERANCE",
    });
    const eligibleRun = await createTestRun({
      name: "Eligible Run",
      project: project._id,
      annotationType: "PER_UTTERANCE",
      sessions: [
        {
          sessionId: session._id,
          status: "DONE",
          name: "Test Session",
          fileType: "json",
          startedAt: new Date(),
          finishedAt: new Date(),
        },
      ],
    });
    const cookieHeader = await loginUser(user._id);

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
    expect(data.eligibleRuns).toHaveLength(1);
    expect(data.eligibleRuns[0]._id).toBe(eligibleRun._id);
  });

  it("excludes runs already in runSet", async () => {
    const user = await UserService.create({
      username: "test_user",
      teams: [],
    });
    const team = await TeamService.create({ name: "Test Team" });
    await UserService.updateById(user._id, {
      teams: [{ team: team._id, role: "ADMIN" }],
    });
    const project = await ProjectService.create({
      name: "Test Project",
      createdBy: user._id,
      team: team._id,
    });
    const session = await SessionService.create({
      name: "Test Session",
      project: project._id,
    });
    const existingRun = await createTestRun({
      name: "Existing Run",
      project: project._id,
      annotationType: "PER_UTTERANCE",
      sessions: [
        {
          sessionId: session._id,
          status: "DONE",
          name: "Test Session",
          fileType: "json",
          startedAt: new Date(),
          finishedAt: new Date(),
        },
      ],
    });
    const runSet = await RunSetService.create({
      name: "Test Run Set",
      project: project._id,
      sessions: [session._id],
      runs: [existingRun._id],
      annotationType: "PER_UTTERANCE",
    });
    const cookieHeader = await loginUser(user._id);

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
    expect(data.eligibleRuns).toHaveLength(0);
  });
});

describe("runSetAddRuns.route loader - IDOR protection", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  it("redirects to run-sets list when runSet belongs to a different project", async () => {
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

    const res = await loader({
      request: new Request("http://localhost/", {
        headers: { cookie: cookieHeader },
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

describe("runSetAddRuns.route action", () => {
  it("returns 403 when user cannot manage project", async () => {
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
    const session = await SessionService.create({
      name: "Test Session",
      project: project._id,
    });
    const runSet = await RunSetService.create({
      name: "Test Run Set",
      project: project._id,
      sessions: [session._id],
      runs: [],
      annotationType: "PER_UTTERANCE",
    });

    const otherUser = await UserService.create({
      username: "other_user",
      teams: [],
    });
    const otherCookie = await loginUser(otherUser._id);

    const req = new Request("http://localhost/", {
      method: "POST",
      headers: { cookie: otherCookie, "content-type": "application/json" },
      body: JSON.stringify({
        intent: "ADD_RUNS",
        payload: { runIds: ["any"] },
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

  it("adds runs and redirects to runSet detail", async () => {
    const user = await UserService.create({
      username: "test_user",
      teams: [],
    });
    const team = await TeamService.create({ name: "Test Team" });
    await UserService.updateById(user._id, {
      teams: [{ team: team._id, role: "ADMIN" }],
    });
    const project = await ProjectService.create({
      name: "Test Project",
      createdBy: user._id,
      team: team._id,
    });
    const session = await SessionService.create({
      name: "Test Session",
      project: project._id,
    });
    const runSet = await RunSetService.create({
      name: "Test Run Set",
      project: project._id,
      sessions: [session._id],
      runs: [],
      annotationType: "PER_UTTERANCE",
    });
    const run = await createTestRun({
      name: "Test Run",
      project: project._id,
      annotationType: "PER_UTTERANCE",
      sessions: [
        {
          sessionId: session._id,
          status: "DONE",
          name: "Test Session",
          fileType: "json",
          startedAt: new Date(),
          finishedAt: new Date(),
        },
      ],
    });
    const cookieHeader = await loginUser(user._id);

    const req = new Request("http://localhost/", {
      method: "POST",
      headers: { cookie: cookieHeader, "content-type": "application/json" },
      body: JSON.stringify({
        intent: "ADD_RUNS",
        payload: { runIds: [run._id] },
      }),
    });

    const resp = await action({
      request: req,
      params: {
        teamId: team._id,
        projectId: project._id,
        runSetId: runSet._id,
      },
    } as any);

    expect(resp).toBeInstanceOf(Response);
    expect((resp as Response).headers.get("Location")).toBe(
      `/teams/${team._id}/projects/${project._id}/run-sets/${runSet._id}`,
    );

    const updatedRunSet = await RunSetService.findById(runSet._id);
    expect(updatedRunSet!.runs).toContain(run._id);
  });

  it("ADD_RUNS returns 404 when runSet belongs to a different project", async () => {
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
      body: JSON.stringify({ intent: "ADD_RUNS", payload: { runIds: [] } }),
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
  });
});
