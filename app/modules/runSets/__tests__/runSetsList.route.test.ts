import { Types } from "mongoose";
import { beforeEach, describe, expect, it } from "vitest";
import { ProjectService } from "~/modules/projects/project";
import { RunSetService } from "~/modules/runSets/runSet";
import "~/modules/teams/team";
import { TeamService } from "~/modules/teams/team";
import { UserService } from "~/modules/users/user";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import loginUser from "../../../../test/helpers/loginUser";
import { action, loader } from "../containers/runSetsList.route";

describe("runSetsList.route loader", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  it("redirects to / when project not found", async () => {
    const team = await TeamService.create({ name: "Team" });
    const user = await UserService.create({
      username: "test_user",
      teams: [{ team: team._id, role: "ADMIN" }],
    });
    const cookieHeader = await loginUser(user._id);
    const fakeProjectId = new Types.ObjectId().toString();

    const res = await loader({
      request: new Request(
        `http://localhost/teams/${team._id}/projects/${fakeProjectId}/run-sets`,
        { headers: { cookie: cookieHeader } },
      ),
      params: { teamId: team._id, projectId: fakeProjectId },
    } as any);

    expect(res).toBeInstanceOf(Response);
    expect((res as Response).headers.get("Location")).toBe("/");
  });

  it("returns runSets for authorized users", async () => {
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
        `http://localhost/teams/${team._id}/projects/${project._id}/run-sets`,
        { headers: { cookie: cookieHeader } },
      ),
      params: { teamId: team._id, projectId: project._id },
    } as any);

    expect(res).not.toBeInstanceOf(Response);
    const loaderData = res as any;
    expect(loaderData.runSets.data).toEqual([]);
    expect(loaderData.runSets.totalPages).toBeDefined();
  });

  it("redirects to / when user cannot view project", async () => {
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
        `http://localhost/teams/${team._id}/projects/${project._id}/run-sets`,
        { headers: { cookie: cookieHeader } },
      ),
      params: { teamId: team._id, projectId: project._id },
    } as any);

    expect(res).toBeInstanceOf(Response);
    expect((res as Response).headers.get("Location")).toBe("/");
  });
});

describe("runSetsList.route action - CREATE_RUN_SET", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  it("returns 403 when user cannot manage project", async () => {
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

    const req = new Request(
      "http://localhost/projects/" + project._id + "/run-sets",
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
      params: { teamId: team._id, projectId: project._id },
    } as any)) as any;
    expect(resp.init?.status).toBe(403);
    expect(resp.data?.errors?.project).toBe("Access denied");
  });

  it("creates runSet successfully", async () => {
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

    const req = new Request(
      "http://localhost/projects/" + project._id + "/run-sets",
      {
        method: "POST",
        headers: { cookie: cookieHeader, "content-type": "application/json" },
        body: JSON.stringify({
          intent: "CREATE_RUN_SET",
          payload: { name: "Test Run Set", annotationType: "PER_UTTERANCE" },
        }),
      },
    );

    const resp = (await action({
      request: req,
      params: { teamId: team._id, projectId: project._id },
    } as any)) as any;

    expect(resp).not.toBeInstanceOf(Response);
    expect(resp.intent).toBe("CREATE_RUN_SET");
    expect(resp._id).toBeDefined();
    expect(resp.name).toBe("Test Run Set");
    expect(resp.project).toBe(project._id);
    expect(resp.annotationType).toBe("PER_UTTERANCE");
  });
});

describe("runSetsList.route action - DELETE_RUN_SET", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  it("returns 403 when user cannot manage project", async () => {
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

    const runSet = await RunSetService.create({
      name: "Test Run Set",
      project: project._id,
      sessions: [],
      runs: [],
      annotationType: "PER_UTTERANCE",
    });

    const cookieHeader = await loginUser(otherUser._id);

    const req = new Request(
      "http://localhost/projects/" + project._id + "/run-sets",
      {
        method: "DELETE",
        headers: { cookie: cookieHeader, "content-type": "application/json" },
        body: JSON.stringify({
          intent: "DELETE_RUN_SET",
          entityId: runSet._id,
        }),
      },
    );

    const resp = (await action({
      request: req,
      params: { teamId: team._id, projectId: project._id },
    } as any)) as any;
    expect(resp.init?.status).toBe(403);
    expect(resp.data?.errors?.project).toBe("Access denied");
  });

  it("deletes runSet successfully", async () => {
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

    const runSet = await RunSetService.create({
      name: "Test Run Set",
      project: project._id,
      sessions: [],
      runs: [],
      annotationType: "PER_UTTERANCE",
    });

    const cookieHeader = await loginUser(user._id);

    const req = new Request(
      "http://localhost/projects/" + project._id + "/run-sets",
      {
        method: "DELETE",
        headers: { cookie: cookieHeader, "content-type": "application/json" },
        body: JSON.stringify({
          intent: "DELETE_RUN_SET",
          entityId: runSet._id,
        }),
      },
    );

    const resp = (await action({
      request: req,
      params: { teamId: team._id, projectId: project._id },
    } as any)) as any;

    expect(resp.intent).toBe("DELETE_RUN_SET");

    const deletedRunSet = await RunSetService.findById(runSet._id);
    expect(deletedRunSet).toBeNull();
  });

  it("returns 404 when runSet not found", async () => {
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
    const fakeRunSetId = new Types.ObjectId().toString();

    const req = new Request(
      "http://localhost/projects/" + project._id + "/run-sets",
      {
        method: "DELETE",
        headers: { cookie: cookieHeader, "content-type": "application/json" },
        body: JSON.stringify({
          intent: "DELETE_RUN_SET",
          entityId: fakeRunSetId,
        }),
      },
    );

    const resp = await action({
      request: req,
      params: { teamId: team._id, projectId: project._id },
    } as any);
    expect((resp as any).init.status).toBe(404);
  });
});

describe("runSetsList.route action - IDOR protection", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  it("DELETE_RUN_SET returns 404 when runSet belongs to a different project", async () => {
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
    const req = new Request(
      "http://localhost/projects/" + projectB._id + "/run-sets",
      {
        method: "POST",
        headers: { cookie: cookieHeader, "content-type": "application/json" },
        body: JSON.stringify({
          intent: "DELETE_RUN_SET",
          entityId: victimRunSet._id,
        }),
      },
    );

    const resp = (await action({
      request: req,
      params: { teamId: teamB._id, projectId: projectB._id },
    } as any)) as any;
    expect(resp.init?.status).toBe(404);
    const stillExists = await RunSetService.findById(victimRunSet._id);
    expect(stillExists).not.toBeNull();
  });

  it("UPDATE_RUN_SET returns 404 when runSet belongs to a different project", async () => {
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
      name: "Original Name",
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
    const req = new Request(
      "http://localhost/projects/" + projectB._id + "/run-sets",
      {
        method: "POST",
        headers: { cookie: cookieHeader, "content-type": "application/json" },
        body: JSON.stringify({
          intent: "UPDATE_RUN_SET",
          entityId: victimRunSet._id,
          payload: { name: "Hacked Name" },
        }),
      },
    );

    const resp = (await action({
      request: req,
      params: { teamId: teamB._id, projectId: projectB._id },
    } as any)) as any;
    expect(resp.init?.status).toBe(404);
    const unchanged = await RunSetService.findById(victimRunSet._id);
    expect(unchanged?.name).toBe("Original Name");
  });
});
