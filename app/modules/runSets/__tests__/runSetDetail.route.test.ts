import { Types } from "mongoose";
import { beforeEach, describe, expect, it } from "vitest";
import { ProjectService } from "~/modules/projects/project";
import type { Project } from "~/modules/projects/projects.types";
import { RunService } from "~/modules/runs/run";
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
import { action, loader } from "../containers/runSetDetail.route";

type LoaderResult = {
  runSet: RunSet;
  project: Project;
};

describe("runSetDetail.route loader", () => {
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

  it("redirects to / when project not found", async () => {
    const fakeId = new Types.ObjectId().toString();
    const res = await loader({
      request: new Request("http://localhost/", {
        headers: { cookie: cookieHeader },
      }),
      params: { teamId: team._id, projectId: fakeId, runSetId: runSet._id },
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
      params: {
        teamId: team._id,
        projectId: project._id,
        runSetId: runSet._id,
      },
      unstable_pattern: "",
      context: {},
    } as any);

    expect(res).toBeInstanceOf(Response);
    expect((res as Response).headers.get("Location")).toBe("/");
  });

  it("redirects to runSets list when runSet not found", async () => {
    const fakeId = new Types.ObjectId().toString();
    const res = await loader({
      request: new Request("http://localhost/", {
        headers: { cookie: cookieHeader },
      }),
      params: { teamId: team._id, projectId: project._id, runSetId: fakeId },
      unstable_pattern: "",
      context: {},
    } as any);

    expect(res).toBeInstanceOf(Response);
    expect((res as Response).headers.get("Location")).toBe(
      `/teams/${team._id}/projects/${project._id}/run-sets`,
    );
  });

  it("returns runSet and project", async () => {
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
    expect(data.runSet._id).toBe(runSet._id);
    expect(data.runSet.name).toBe("Test Run Set");
    expect(data.project._id).toBe(project._id);
  });

  it("returns runSet with multiple runs and sessions", async () => {
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
    expect(data.runSet._id).toBe(multiRunSet._id);
    expect(data.runSet.runs).toHaveLength(2);
    expect(data.runSet.sessions).toHaveLength(2);
  });

  it("returns runSet data in correct format", async () => {
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

    expect(data).toHaveProperty("runSet");
    expect(data).toHaveProperty("project");

    expect(data.runSet).toHaveProperty("_id");
    expect(data.runSet).toHaveProperty("name");
    expect(data.runSet).toHaveProperty("project");
    expect(data.runSet).toHaveProperty("sessions");
    expect(data.runSet).toHaveProperty("runs");
  });
});

describe("runSetDetail.route action", () => {
  let user: User;
  let team: Team;
  let project: Project;
  let runSet: RunSet;
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

    cookieHeader = await loginUser(user._id);
  });

  it("stops all active runs in a run set", async () => {
    const activeRun1 = await createTestRun({
      name: "Active Run 1",
      project: project._id,
      annotationType: "PER_UTTERANCE",
      isRunning: true,
      isComplete: false,
    });
    const activeRun2 = await createTestRun({
      name: "Active Run 2",
      project: project._id,
      annotationType: "PER_UTTERANCE",
      isRunning: false,
      isComplete: false,
    });
    const completedRun = await createTestRun({
      name: "Completed Run",
      project: project._id,
      annotationType: "PER_UTTERANCE",
      isRunning: false,
      isComplete: true,
    });

    runSet = await RunSetService.create({
      name: "Test Run Set",
      project: project._id,
      sessions: [],
      runs: [activeRun1._id, activeRun2._id, completedRun._id],
      annotationType: "PER_UTTERANCE",
    });

    const res = await action({
      request: new Request("http://localhost/", {
        method: "POST",
        headers: {
          cookie: cookieHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ intent: "STOP_ALL_RUNS", payload: {} }),
      }),
      params: {
        teamId: team._id,
        projectId: project._id,
        runSetId: runSet._id,
      },
      unstable_pattern: "",
      context: {},
    } as any);

    expect(res).toEqual({ intent: "STOP_ALL_RUNS" });

    const run1 = await RunService.findById(activeRun1._id);
    expect(run1!.stoppedAt).not.toBeNull();
    expect(run1!.isRunning).toBe(false);

    const run2 = await RunService.findById(activeRun2._id);
    expect(run2!.stoppedAt).not.toBeNull();

    const completedRunAfter = await RunService.findById(completedRun._id);
    expect(completedRunAfter!.stoppedAt).toBeUndefined();
    expect(completedRunAfter!.isComplete).toBe(true);
  });
});

describe("runSetDetail.route loader - IDOR protection", () => {
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

describe("runSetDetail.route action - IDOR protection", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  it("STOP_ALL_RUNS returns 404 when runSet belongs to a different project", async () => {
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
      body: JSON.stringify({ intent: "STOP_ALL_RUNS", payload: {} }),
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

  it("EXPORT_RUN_SET returns 404 when runSet belongs to a different project", async () => {
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
      body: JSON.stringify({
        intent: "EXPORT_RUN_SET",
        payload: { exportType: "json" },
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
  });
});
