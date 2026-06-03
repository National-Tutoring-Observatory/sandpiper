import { beforeEach, describe, expect, it } from "vitest";
import { RunSetService } from "~/modules/runSets/runSet";
import "~/modules/teams/team";
import { TeamService } from "~/modules/teams/team";
import { UserService } from "~/modules/users/user";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import createTestRun from "../../../../test/helpers/createTestRun";
import expectAuthRequired from "../../../../test/helpers/expectAuthRequired";
import loginUser from "../../../../test/helpers/loginUser";
import { ProjectService } from "../../projects/project";
import { action } from "../containers/runAddToRunSet.route";

describe("runAddToRunSet.route action - ADD_TO_RUN_SETS", () => {
  let user: any;
  let team: any;
  let project: any;
  let run: any;
  let runSet: any;
  let cookieHeader: string;

  beforeEach(async () => {
    await clearDocumentDB();

    user = await UserService.create({ username: "test_user", teams: [] });
    team = await TeamService.create({ name: "Test Team" });
    await UserService.updateById(user._id, {
      teams: [{ team: team._id, role: "ADMIN" }],
    });

    project = await ProjectService.create({
      name: "Test Project",
      createdBy: user._id,
      team: team._id,
    });

    run = await createTestRun({
      name: "Test Run",
      project: project._id,
      annotationType: "PER_UTTERANCE",
      sessions: [],
    });

    runSet = await RunSetService.create({
      name: "Test Run Set",
      project: project._id,
      annotationType: "PER_UTTERANCE",
      sessions: [],
      runs: [],
    });

    cookieHeader = await loginUser(user._id);
  });

  it("adds run to multiple runSets successfully", async () => {
    const runSet2 = await RunSetService.create({
      name: "Test RunSet 2",
      project: project._id,
      annotationType: "PER_UTTERANCE",
      sessions: [],
      runs: [],
    });

    const req = new Request(
      `http://localhost/projects/${project._id}/runs/${run._id}/add-to-run-set`,
      {
        method: "POST",
        headers: { cookie: cookieHeader, "content-type": "application/json" },
        body: JSON.stringify({
          intent: "ADD_TO_RUN_SETS",
          payload: { runSetIds: [runSet._id, runSet2._id] },
        }),
      },
    );

    const resp = (await action({
      request: req,
      params: { teamId: team._id, projectId: project._id, runId: run._id },
    } as any)) as any;

    expect(resp).not.toBeInstanceOf(Response);
    expect(resp.data.success).toBe(true);
    expect(resp.data.intent).toBe("ADD_TO_RUN_SETS");
    expect(resp.data.data.count).toBe(2);

    const updatedRunSet1 = await RunSetService.findById(runSet._id);
    const updatedRunSet2 = await RunSetService.findById(runSet2._id);

    expect(updatedRunSet1?.runs).toContain(run._id);
    expect(updatedRunSet2?.runs).toContain(run._id);
  });

  it("adds run to single runSet successfully", async () => {
    const req = new Request(
      `http://localhost/projects/${project._id}/runs/${run._id}/add-to-run-set`,
      {
        method: "POST",
        headers: { cookie: cookieHeader, "content-type": "application/json" },
        body: JSON.stringify({
          intent: "ADD_TO_RUN_SETS",
          payload: { runSetIds: [runSet._id] },
        }),
      },
    );

    const resp = (await action({
      request: req,
      params: { teamId: team._id, projectId: project._id, runId: run._id },
    } as any)) as any;

    expect(resp).not.toBeInstanceOf(Response);
    expect(resp.data.success).toBe(true);
    expect(resp.data.data.count).toBe(1);

    const updatedRunSet = await RunSetService.findById(runSet._id);
    expect(updatedRunSet?.runs).toContain(run._id);
  });

  it("returns 403 when user lacks permission to manage runs", async () => {
    const otherUser = await UserService.create({
      username: "other_user",
      teams: [],
    });
    const otherTeam = await TeamService.create({ name: "Other Team" });
    await UserService.updateById(otherUser._id, {
      teams: [{ team: otherTeam._id, role: "MEMBER" }],
    });

    const otherCookieHeader = await loginUser(otherUser._id);

    const req = new Request(
      `http://localhost/projects/${project._id}/runs/${run._id}/add-to-run-set`,
      {
        method: "POST",
        headers: {
          cookie: otherCookieHeader,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          intent: "ADD_TO_RUN_SETS",
          payload: { runSetIds: [runSet._id] },
        }),
      },
    );

    const resp = (await action({
      request: req,
      params: { teamId: team._id, projectId: project._id, runId: run._id },
    } as any)) as any;

    expect(resp.init?.status).toBe(403);
    expect(resp.data.errors.project).toBe("Access denied");
  });
});

describe("runAddToRunSet.route action - CREATE_RUN_SET", () => {
  let user: any;
  let team: any;
  let project: any;
  let run: any;
  let cookieHeader: string;

  beforeEach(async () => {
    await clearDocumentDB();

    user = await UserService.create({ username: "test_user", teams: [] });
    team = await TeamService.create({ name: "Test Team" });
    await UserService.updateById(user._id, {
      teams: [{ team: team._id, role: "ADMIN" }],
    });

    project = await ProjectService.create({
      name: "Test Project",
      createdBy: user._id,
      team: team._id,
    });

    run = await createTestRun({
      name: "Test Run",
      project: project._id,
      isRunning: false,
      isComplete: false,
    });

    cookieHeader = await loginUser(user._id);
  });

  it("creates runSet for run successfully", async () => {
    const req = new Request(
      `http://localhost/projects/${project._id}/runs/${run._id}/add-to-run-set`,
      {
        method: "POST",
        headers: { cookie: cookieHeader, "content-type": "application/json" },
        body: JSON.stringify({
          intent: "CREATE_RUN_SET",
          payload: { name: "Test Run Set" },
        }),
      },
    );

    const resp = (await action({
      request: req,
      params: { teamId: team._id, projectId: project._id, runId: run._id },
    } as any)) as any;

    expect(resp).not.toBeInstanceOf(Response);
    expect(resp.data.success).toBe(true);
    expect(resp.data.intent).toBe("CREATE_RUN_SET");
    expect(resp.data.data.redirectTo).toContain("/run-sets/");

    const runSet = await RunSetService.findById(
      resp.data.data.redirectTo.split("/").pop(),
    );
    expect(runSet?.name).toBe("Test Run Set");
    expect(runSet?.runs).toContain(run._id);
  });

  it("returns 400 when name is too short", async () => {
    const req = new Request(
      `http://localhost/projects/${project._id}/runs/${run._id}/add-to-run-set`,
      {
        method: "POST",
        headers: { cookie: cookieHeader, "content-type": "application/json" },
        body: JSON.stringify({
          intent: "CREATE_RUN_SET",
          payload: { name: "ab" },
        }),
      },
    );

    const resp = (await action({
      request: req,
      params: { teamId: team._id, projectId: project._id, runId: run._id },
    } as any)) as any;

    expect(resp.init?.status).toBe(400);
    expect(resp.data.errors.name).toBe(
      "Run set name must be at least 3 characters",
    );
  });

  it("returns 403 when user lacks permission", async () => {
    const otherUser = await UserService.create({
      username: "other_user",
      teams: [],
    });
    const otherTeam = await TeamService.create({ name: "Other Team" });
    await UserService.updateById(otherUser._id, {
      teams: [{ team: otherTeam._id, role: "ADMIN" }],
    });

    const otherCookieHeader = await loginUser(otherUser._id);

    const req = new Request(
      `http://localhost/projects/${project._id}/runs/${run._id}/add-to-run-set`,
      {
        method: "POST",
        headers: {
          cookie: otherCookieHeader,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          intent: "CREATE_RUN_SET",
          payload: { name: "Test Run Set" },
        }),
      },
    );

    const resp = (await action({
      request: req,
      params: { teamId: team._id, projectId: project._id, runId: run._id },
    } as any)) as any;

    expect(resp.init?.status).toBe(403);
    expect(resp.data.errors.project).toBe("Access denied");
  });

  it("redirects to / when user not authenticated", async () => {
    const req = new Request(
      `http://localhost/projects/${project._id}/runs/${run._id}/add-to-run-set`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          intent: "CREATE_RUN_SET",
          payload: { name: "Test Run Set" },
        }),
      },
    );

    await expectAuthRequired(() =>
      action({
        request: req,
        params: { teamId: team._id, projectId: project._id, runId: run._id },
      } as any),
    );
  });

  it("ADD_TO_RUN_SETS returns 404 when runSetIds belong to a different project", async () => {
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
    const attackerRun = await createTestRun({
      project: projectB._id,
      name: "Attacker Run",
    });

    const cookieHeader = await loginUser(attacker._id);
    const req = new Request("http://localhost/", {
      method: "POST",
      headers: { cookie: cookieHeader, "content-type": "application/json" },
      body: JSON.stringify({
        intent: "ADD_TO_RUN_SETS",
        payload: { runSetIds: [victimRunSet._id] },
      }),
    });

    const resp = (await action({
      request: req,
      params: {
        teamId: teamB._id,
        projectId: projectB._id,
        runId: attackerRun._id,
      },
    } as any)) as any;
    expect(resp.init?.status).toBe(404);
    const victimUnchanged = await RunSetService.findById(victimRunSet._id);
    expect(victimUnchanged!.runs).toHaveLength(0);
  });
});
