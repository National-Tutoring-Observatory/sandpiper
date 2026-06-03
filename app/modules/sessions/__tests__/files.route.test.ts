import { Types } from "mongoose";
import { beforeEach, describe, expect, it } from "vitest";
import { ProjectService } from "~/modules/projects/project";
import "~/modules/teams/team";
import { TeamService } from "~/modules/teams/team";
import { UserService } from "~/modules/users/user";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import loginUser from "../../../../test/helpers/loginUser";
import { loader } from "../containers/files.route";

describe("files.route loader", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  it("redirects to / when project not found", async () => {
    const team = await TeamService.create({ name: "Test Team" });
    const user = await UserService.create({
      username: "test_user",
      teams: [{ team: team._id, role: "ADMIN" }],
    });
    const cookieHeader = await loginUser(user._id);
    const fakeProjectId = new Types.ObjectId().toString();

    const res = await loader({
      request: new Request(
        `http://localhost/teams/${team._id}/projects/${fakeProjectId}/files`,
        { headers: { cookie: cookieHeader } },
      ),
      params: { teamId: team._id, projectId: fakeProjectId },
    } as any);

    expect(res).toBeInstanceOf(Response);
    expect((res as Response).headers.get("Location")).toBe("/");
  });

  it("returns files for authorized user", async () => {
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
        `http://localhost/teams/${team._id}/projects/${project._id}/files`,
        { headers: { cookie: cookieHeader } },
      ),
      params: { teamId: team._id, projectId: project._id.toString() },
    } as any);

    expect(res).not.toBeInstanceOf(Response);
    expect((res as any).files).toBeDefined();
  });
});
