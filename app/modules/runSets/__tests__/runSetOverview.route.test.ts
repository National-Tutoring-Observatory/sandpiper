import { beforeEach, describe, expect, it } from "vitest";
import { ProjectService } from "~/modules/projects/project";
import type { Project } from "~/modules/projects/projects.types";
import type { Run } from "~/modules/runs/runs.types";
import { RunSetService } from "~/modules/runSets/runSet";
import type { RunSet } from "~/modules/runSets/runSets.types";
import { SessionService } from "~/modules/sessions/session";
import type { Session } from "~/modules/sessions/sessions.types";
import { TeamService } from "~/modules/teams/team";
import type { Team } from "~/modules/teams/teams.types";
import { UserService } from "~/modules/users/user";
import type { User } from "~/modules/users/users.types";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import createTestRun from "../../../../test/helpers/createTestRun";
import expectAuthRequired from "../../../../test/helpers/expectAuthRequired";
import loginUser from "../../../../test/helpers/loginUser";
import { action, loader } from "../containers/runSetOverview.route";

type LoaderResult = {
  runs: { data: Run[]; count: number; totalPages: number };
  sessions: { data: Session[]; count: number; totalPages: number };
};

describe("runSetOverview.route loader", () => {
  let user: User;
  let team: Team;
  let project: Project;
  let runSet: RunSet;
  let session: Session;
  let run: Run;
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
    run = await createTestRun({
      name: "Test Run",
      project: project._id,
      annotationType: "PER_UTTERANCE",
      isRunning: false,
      isComplete: false,
    });
    runSet = await RunSetService.create({
      name: "Test Run Set",
      project: project._id,
      sessions: [session._id],
      runs: [run._id],
      annotationType: "PER_UTTERANCE",
    });

    cookieHeader = await loginUser(user._id);
  });

  it("redirects to / when there is no session", async () => {
    await expectAuthRequired(() =>
      loader({
        request: new Request("http://localhost/"),
        params: {
          teamId: team._id,
          projectId: project._id,
          runSetId: runSet._id,
        },
        unstable_pattern: "",
        context: {},
      } as any),
    );
  });

  it("returns empty runs and sessions for empty runSet", async () => {
    const emptyRunSet = await RunSetService.create({
      name: "Empty RunSet",
      project: project._id,
      sessions: [],
      runs: [],
      annotationType: "PER_UTTERANCE",
    });

    const res = await loader({
      request: new Request("http://localhost/", {
        headers: { cookie: cookieHeader },
      }),
      params: {
        teamId: team._id,
        projectId: project._id,
        runSetId: emptyRunSet._id,
      },
      unstable_pattern: "",
      context: {},
    } as any);

    expect(res).not.toBeInstanceOf(Response);
    const data = res as LoaderResult;
    expect(data.runs.data).toEqual([]);
    expect(data.runs.count).toBe(0);
    expect(data.runs.totalPages).toBe(0);
    expect(data.sessions.data).toEqual([]);
    expect(data.sessions.count).toBe(0);
    expect(data.sessions.totalPages).toBe(0);
  });

  it("returns runs and sessions", async () => {
    const res = await loader({
      request: new Request("http://localhost/", {
        headers: { cookie: cookieHeader },
      }),
      params: {
        teamId: team._id,
        projectId: project._id,
        runSetId: runSet._id,
      },
      unstable_pattern: "",
      context: {},
    } as any);

    expect(res).not.toBeInstanceOf(Response);
    const data = res as LoaderResult;
    expect(data.runs.data).toHaveLength(1);
    expect(data.runs.data[0]._id).toBe(run._id);
    expect(data.runs.count).toBe(1);
    expect(data.runs.totalPages).toBe(1);
    expect(data.sessions.data).toHaveLength(1);
    expect(data.sessions.data[0]._id).toBe(session._id);
    expect(data.sessions.count).toBe(1);
    expect(data.sessions.totalPages).toBe(1);
  });

  it("returns multiple runs and sessions", async () => {
    const session2 = await SessionService.create({
      name: "Test Session 2",
      project: project._id,
    });
    const run2 = await createTestRun({
      name: "Test Run 2",
      project: project._id,
      annotationType: "PER_UTTERANCE",
      isRunning: true,
      isComplete: false,
    });

    const multiRunSet = await RunSetService.create({
      name: "Multi RunSet",
      project: project._id,
      sessions: [session._id, session2._id],
      runs: [run._id, run2._id],
      annotationType: "PER_UTTERANCE",
    });

    const res = await loader({
      request: new Request("http://localhost/", {
        headers: { cookie: cookieHeader },
      }),
      params: {
        teamId: team._id,
        projectId: project._id,
        runSetId: multiRunSet._id,
      },
      unstable_pattern: "",
      context: {},
    } as any);

    expect(res).not.toBeInstanceOf(Response);
    const data = res as LoaderResult;
    expect(data.runs.data).toHaveLength(2);
    expect(data.runs.count).toBe(2);
    expect(data.sessions.data).toHaveLength(2);
    expect(data.sessions.count).toBe(2);
  });

  it("returns data in correct format", async () => {
    const res = await loader({
      request: new Request("http://localhost/", {
        headers: { cookie: cookieHeader },
      }),
      params: {
        teamId: team._id,
        projectId: project._id,
        runSetId: runSet._id,
      },
      unstable_pattern: "",
      context: {},
    } as any);

    expect(res).not.toBeInstanceOf(Response);
    const data = res as LoaderResult;

    expect(data).toHaveProperty("runs");
    expect(data).toHaveProperty("sessions");

    expect(data.runs).toHaveProperty("data");
    expect(data.runs).toHaveProperty("count");
    expect(data.runs).toHaveProperty("totalPages");

    expect(data.sessions).toHaveProperty("data");
    expect(data.sessions).toHaveProperty("count");
    expect(data.sessions).toHaveProperty("totalPages");
  });

  it("filters runs by COMPLETE status", async () => {
    const completeRun = await createTestRun({
      name: "Complete Run",
      project: project._id,
      annotationType: "PER_UTTERANCE",
      isRunning: false,
      isComplete: true,
    });
    const multiRunSet = await RunSetService.create({
      name: "Multi RunSet",
      project: project._id,
      sessions: [],
      runs: [run._id, completeRun._id],
      annotationType: "PER_UTTERANCE",
    });

    const res = await loader({
      request: new Request("http://localhost/?runsFilter_status=COMPLETE", {
        headers: { cookie: cookieHeader },
      }),
      params: {
        teamId: team._id,
        projectId: project._id,
        runSetId: multiRunSet._id,
      },
      unstable_pattern: "",
      context: {},
    } as any);

    const data = res as LoaderResult;
    expect(data.runs.data).toHaveLength(1);
    expect(data.runs.data[0].name).toBe("Complete Run");
  });

  it("filters runs by QUEUED status", async () => {
    const completeRun = await createTestRun({
      name: "Complete Run",
      project: project._id,
      annotationType: "PER_UTTERANCE",
      isRunning: false,
      isComplete: true,
    });
    const multiRunSet = await RunSetService.create({
      name: "Multi RunSet",
      project: project._id,
      sessions: [],
      runs: [run._id, completeRun._id],
      annotationType: "PER_UTTERANCE",
    });

    const res = await loader({
      request: new Request("http://localhost/?runsFilter_status=QUEUED", {
        headers: { cookie: cookieHeader },
      }),
      params: {
        teamId: team._id,
        projectId: project._id,
        runSetId: multiRunSet._id,
      },
      unstable_pattern: "",
      context: {},
    } as any);

    const data = res as LoaderResult;
    expect(data.runs.data).toHaveLength(1);
    expect(data.runs.data[0].name).toBe("Test Run");
  });

  it("returns all runs when no status filter is applied", async () => {
    const completeRun = await createTestRun({
      name: "Complete Run",
      project: project._id,
      annotationType: "PER_UTTERANCE",
      isRunning: false,
      isComplete: true,
    });
    const multiRunSet = await RunSetService.create({
      name: "Multi RunSet",
      project: project._id,
      sessions: [],
      runs: [run._id, completeRun._id],
      annotationType: "PER_UTTERANCE",
    });

    const res = await loader({
      request: new Request("http://localhost/", {
        headers: { cookie: cookieHeader },
      }),
      params: {
        teamId: team._id,
        projectId: project._id,
        runSetId: multiRunSet._id,
      },
      unstable_pattern: "",
      context: {},
    } as any);

    const data = res as LoaderResult;
    expect(data.runs.data).toHaveLength(2);
  });

  it("paginates sessions correctly", async () => {
    const res = await loader({
      request: new Request(
        "http://localhost/?sessionsCurrentPage=1&sessionsSort=-createdAt",
        {
          headers: { cookie: cookieHeader },
        },
      ),
      params: {
        teamId: team._id,
        projectId: project._id,
        runSetId: runSet._id,
      },
      unstable_pattern: "",
      context: {},
    } as any);

    expect(res).not.toBeInstanceOf(Response);
    const data = res as LoaderResult;
    expect(data.sessions.data).toHaveLength(1);
    expect(data.sessions.totalPages).toBe(1);
  });
});

describe("runSetOverview.route loader - IDOR protection", () => {
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
      unstable_pattern: "",
      context: {},
    } as any);

    expect(res).toBeInstanceOf(Response);
    expect((res as Response).headers.get("Location")).toBe(
      `/teams/${teamB._id}/projects/${projectB._id}/run-sets`,
    );
  });
});

describe("runSetOverview.route action", () => {
  let user: User;
  let team: Team;
  let project: Project;
  let runSet: RunSet;
  let run: Run;
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
      isRunning: false,
      isComplete: false,
    });
    runSet = await RunSetService.create({
      name: "Test Run Set",
      project: project._id,
      sessions: [],
      runs: [run._id],
      annotationType: "PER_UTTERANCE",
    });
    cookieHeader = await loginUser(user._id);
  });

  it("redirects to / when unauthenticated for REMOVE_RUN_FROM_RUN_SET", async () => {
    await expectAuthRequired(() =>
      action({
        request: new Request("http://localhost/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            intent: "REMOVE_RUN_FROM_RUN_SET",
            payload: { runId: run._id },
          }),
        }),
        params: {
          teamId: team._id,
          projectId: project._id,
          runSetId: runSet._id,
        },
      } as any),
    );
  });

  it("removes run from run set when authenticated", async () => {
    const res = await action({
      request: new Request("http://localhost/", {
        method: "POST",
        headers: { cookie: cookieHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "REMOVE_RUN_FROM_RUN_SET",
          payload: { runId: run._id },
        }),
      }),
      params: {
        teamId: team._id,
        projectId: project._id,
        runSetId: runSet._id,
      },
    } as any);

    expect(res).not.toBeInstanceOf(Response);
    expect((res as any).intent).toBe("REMOVE_RUN_FROM_RUN_SET");
    const updated = await RunSetService.findById(runSet._id);
    expect(updated?.runs).not.toContain(run._id);
  });

  it("REMOVE_RUN_FROM_RUN_SET returns 404 when runSet belongs to a different project", async () => {
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
    const victimRun = await createTestRun({
      name: "Victim Run",
      project: projectA._id,
      annotationType: "PER_UTTERANCE",
      isRunning: false,
      isComplete: false,
    });
    const victimRunSet = await RunSetService.create({
      name: "Victim Run Set",
      project: projectA._id,
      sessions: [],
      runs: [victimRun._id],
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

    const attackerCookie = await loginUser(attacker._id);
    const resp = (await action({
      request: new Request("http://localhost/", {
        method: "POST",
        headers: {
          cookie: attackerCookie,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intent: "REMOVE_RUN_FROM_RUN_SET",
          payload: { runId: victimRun._id },
        }),
      }),
      params: {
        teamId: teamB._id,
        projectId: projectB._id,
        runSetId: victimRunSet._id,
      },
    } as any)) as any;

    expect(resp.init?.status).toBe(404);
    const victimUnchanged = await RunSetService.findById(victimRunSet._id);
    expect(victimUnchanged!.runs).toContain(victimRun._id);
  });
});
