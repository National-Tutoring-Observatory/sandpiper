import { beforeEach, describe, expect, it } from "vitest";
import { ProjectService } from "~/modules/projects/project";
import "~/modules/teams/team";
import { TeamService } from "~/modules/teams/team";
import { UserService } from "~/modules/users/user";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import createTestRun from "../../../../test/helpers/createTestRun";
import expectAuthRequired from "../../../../test/helpers/expectAuthRequired";
import loginUser from "../../../../test/helpers/loginUser";
import { loader } from "../containers/runs.route";

describe("runs.route loader - authorization", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  it("redirects unauthenticated users", async () => {
    const team = await TeamService.create({ name: "Team" });
    const user = await UserService.create({
      username: "test_user",
      teams: [{ team: team._id, role: "ADMIN" }],
    });
    const project = await ProjectService.create({
      name: "Project",
      createdBy: user._id,
      team: team._id,
    });

    await expectAuthRequired(() =>
      loader({
        request: new Request(
          `http://localhost/teams/${team._id}/projects/${project._id}/runs`,
        ),
        params: { teamId: team._id, projectId: project._id },
      } as any),
    );
  });

  it("redirects users who are not members of the project's team", async () => {
    const team = await TeamService.create({ name: "Team" });
    const owner = await UserService.create({
      username: "owner",
      teams: [{ team: team._id, role: "ADMIN" }],
    });
    const project = await ProjectService.create({
      name: "Project",
      createdBy: owner._id,
      team: team._id,
    });

    const outsider = await UserService.create({
      username: "outsider",
      teams: [],
    });
    const cookieHeader = await loginUser(outsider._id);

    const res = await loader({
      request: new Request(
        `http://localhost/teams/${team._id}/projects/${project._id}/runs`,
        { headers: { cookie: cookieHeader } },
      ),
      params: { teamId: team._id, projectId: project._id },
    } as any);

    expect(res).toBeInstanceOf(Response);
    expect((res as Response).status).toBe(302);
  });
});

describe("runs.route loader", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  it("returns empty runs list for project with no runs", async () => {
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
        `http://localhost/teams/${team._id}/projects/${project._id}/runs`,
        { headers: { cookie: cookieHeader } },
      ),
      params: { teamId: team._id, projectId: project._id },
    } as any);

    expect(res).not.toBeInstanceOf(Response);
    expect((res as any).runs.data).toEqual([]);
    expect((res as any).runs.totalPages).toBe(0);
  });

  it("returns runs list for project with runs", async () => {
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

    const run = await createTestRun({
      name: "Test Run",
      project: project._id,
      isRunning: false,
      isComplete: false,
    });

    const cookieHeader = await loginUser(user._id);

    const res = await loader({
      request: new Request(
        `http://localhost/teams/${team._id}/projects/${project._id}/runs`,
        { headers: { cookie: cookieHeader } },
      ),
      params: { teamId: team._id, projectId: project._id },
    } as any);

    expect(res).not.toBeInstanceOf(Response);
    expect((res as any).runs.data).toHaveLength(1);
    expect((res as any).runs.data[0]._id).toBe(run._id);
    expect((res as any).runs.data[0].name).toBe("Test Run");
    // Ensure no .data property on returned run
    expect((res as any).runs.data[0].data).toBeUndefined();
  });
});
