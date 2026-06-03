import { Types } from "mongoose";
import { beforeEach, describe, expect, it } from "vitest";
import { ProjectService } from "~/modules/projects/project";
import "~/modules/teams/team";
import { TeamService } from "~/modules/teams/team";
import { UserService } from "~/modules/users/user";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import expectAuthRequired from "../../../../test/helpers/expectAuthRequired";
import loginUser from "../../../../test/helpers/loginUser";
import { action, loader } from "../containers/sessions.route";

describe("sessions.route loader", () => {
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
        `http://localhost/teams/${team._id}/projects/${fakeProjectId}/sessions`,
        { headers: { cookie: cookieHeader } },
      ),
      params: { teamId: team._id, projectId: fakeProjectId },
    } as any);

    expect(res).toBeInstanceOf(Response);
    expect((res as Response).headers.get("Location")).toBe("/");
  });

  it("redirects to / when unauthenticated", async () => {
    const user = await UserService.create({ username: "test_user" });
    const team = await TeamService.create({ name: "Test Team" });
    await UserService.updateById(user._id, {
      teams: [{ team: team._id, role: "ADMIN" }],
    });
    const project = await ProjectService.create({
      name: "Test Project",
      createdBy: user._id,
      team: team._id,
    });

    await expectAuthRequired(() =>
      loader({
        request: new Request(
          `http://localhost/teams/${team._id}/projects/${project._id}/sessions`,
        ),
        params: { teamId: team._id, projectId: project._id.toString() },
      } as any),
    );
  });

  it("returns sessions for authorized user", async () => {
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
        `http://localhost/teams/${team._id}/projects/${project._id}/sessions`,
        { headers: { cookie: cookieHeader } },
      ),
      params: { teamId: team._id, projectId: project._id.toString() },
    } as any);

    expect(res).not.toBeInstanceOf(Response);
    expect((res as any).sessions).toBeDefined();
  });
});

describe("sessions.route action", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  it("redirects to / when unauthenticated for RE_RUN", async () => {
    const user = await UserService.create({ username: "owner", teams: [] });
    const team = await TeamService.create({ name: "Test Team" });
    await UserService.updateById(user._id, {
      teams: [{ team: team._id, role: "ADMIN" }],
    });
    const project = await ProjectService.create({
      name: "Test Project",
      createdBy: user._id,
      team: team._id,
    });

    await expectAuthRequired(() =>
      action({
        request: new Request(
          `http://localhost/teams/${team._id}/projects/${project._id}/sessions`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ intent: "RE_RUN" }),
          },
        ),
        params: { teamId: team._id, projectId: project._id.toString() },
      } as any),
    );
  });

  it("redirects to / when user cannot view project for RE_RUN", async () => {
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

    const otherUser = await UserService.create({
      username: "other_user",
      teams: [],
    });
    const cookieHeader = await loginUser(otherUser._id);

    const res = await action({
      request: new Request(
        `http://localhost/teams/${team._id}/projects/${project._id}/sessions`,
        {
          method: "POST",
          headers: { cookie: cookieHeader, "Content-Type": "application/json" },
          body: JSON.stringify({ intent: "RE_RUN" }),
        },
      ),
      params: { teamId: team._id, projectId: project._id.toString() },
    } as any);

    expect(res).toBeInstanceOf(Response);
    expect((res as Response).headers.get("Location")).toBe("/");
  });
});
