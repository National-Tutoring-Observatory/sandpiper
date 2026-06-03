import { Types } from "mongoose";
import { beforeEach, describe, expect, it } from "vitest";
import "~/modules/teams/team";
import { TeamService } from "~/modules/teams/team";
import { UserService } from "~/modules/users/user";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import expectAuthRequired from "../../../../test/helpers/expectAuthRequired";
import loginUser from "../../../../test/helpers/loginUser";
import { loader } from "../containers/project.route";
import { ProjectService } from "../project";

const createValidId = () => new Types.ObjectId().toString();

describe("project.route loader", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  it("redirects to / when there is no session cookie", async () => {
    await expectAuthRequired(() =>
      loader({
        request: new Request("http://localhost/teams/123/projects/123"),
        params: { teamId: "123", projectId: "123" },
      } as any),
    );
  });

  it("redirects to / when project not found", async () => {
    const user = await UserService.create({ username: "test_user" });
    const team = await TeamService.create({ name: "Test Team" });

    const fakeProjectId = createValidId();
    const cookieHeader = await loginUser(user._id);

    const res = await loader({
      request: new Request(
        `http://localhost/teams/${team._id}/projects/${fakeProjectId}`,
        {
          headers: { cookie: cookieHeader },
        },
      ),
      params: { teamId: team._id, projectId: fakeProjectId },
    } as any);

    expect(res).toBeInstanceOf(Response);
    expect((res as Response).headers.get("Location")).toBe("/");
  });

  it("redirects to / when user cannot view project", async () => {
    const owner = await UserService.create({ username: "owner" });
    const otherUser = await UserService.create({ username: "other_user" });
    const team = await TeamService.create({ name: "Private Team" });

    const project = await ProjectService.create({
      name: "Private Project",
      createdBy: owner._id,
      team: team._id,
    });

    const cookieHeader = await loginUser(otherUser._id);

    const res = await loader({
      request: new Request(
        `http://localhost/teams/${team._id}/projects/${project._id}`,
        {
          headers: { cookie: cookieHeader },
        },
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
      hasSetupProject: true,
    });

    const cookieHeader = await loginUser(user._id);

    const res = await loader({
      request: new Request(
        `http://localhost/teams/${team._id}/projects/${project._id}`,
        {
          headers: { cookie: cookieHeader },
        },
      ),
      params: { teamId: team._id, projectId: project._id },
    } as any);

    expect(res).not.toBeInstanceOf(Response);
    expect((res as any).project._id).toBe(project._id);
    expect((res as any).project.name).toBe("Test Project");
    expect((res as any).filesCount).toBe(0);
    expect((res as any).sessionsCount).toBe(0);
  });

  it("redirects to upload-files when project has not been set up", async () => {
    const user = await UserService.create({ username: "test_user", teams: [] });

    const team = await TeamService.create({ name: "Test Team" });

    await UserService.updateById(user._id, {
      teams: [{ team: team._id, role: "ADMIN" }],
    });

    const project = await ProjectService.create({
      name: "Test Project",
      createdBy: user._id,
      team: team._id,
      hasSetupProject: false,
    });

    const cookieHeader = await loginUser(user._id);

    const res = await loader({
      request: new Request(
        `http://localhost/teams/${team._id}/projects/${project._id}`,
        {
          headers: { cookie: cookieHeader },
        },
      ),
      params: { teamId: team._id, projectId: project._id },
    } as any);

    expect(res).toBeInstanceOf(Response);
    expect((res as Response).headers.get("Location")).toBe(
      `/teams/${team._id}/projects/${project._id}/upload-files`,
    );
  });
});
