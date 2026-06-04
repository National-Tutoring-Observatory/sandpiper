import { beforeEach, describe, expect, it } from "vitest";
import { UserService } from "~/modules/users/user";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import expectAuthRequired from "../../../../test/helpers/expectAuthRequired";
import loginUser from "../../../../test/helpers/loginUser";
import { action, loader } from "../containers/team.route";
import { TeamService } from "../team";

describe("team.route loader", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  it("redirects to / when there is no session cookie", async () => {
    const team = await TeamService.create({ name: "test team" });

    await expectAuthRequired(() =>
      loader({
        request: new Request("http://localhost/teams/" + team._id),
        params: { teamId: team._id },
      } as any),
    );
  });

  it("returns team when user is super admin", async () => {
    const team = await TeamService.create({ name: "test team" });
    const admin = await UserService.create({
      username: "admin",
      role: "SUPER_ADMIN",
      teams: [],
    });

    const cookieHeader = await loginUser(admin._id);

    const result = (await loader({
      request: new Request("http://localhost/teams/" + team._id, {
        headers: { cookie: cookieHeader },
      }),
      params: { teamId: team._id },
    } as any)) as any;

    expect(result.team._id).toBe(team._id);
    expect(result.team.name).toBe("test team");
  });

  it("redirects to / when team does not exist and no auth", async () => {
    await expectAuthRequired(() =>
      loader({
        request: new Request("http://localhost/teams/nonexistent"),
        params: { teamId: "nonexistent" },
      } as any),
    );
  });
});

describe("team.route action - UPDATE_TEAM", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  it("updates the team in the URL when user is team admin", async () => {
    const team = await TeamService.create({ name: "original" });
    const user = await UserService.create({
      username: "user1",
      role: "USER",
      teams: [{ team: team._id, role: "ADMIN" }],
    });

    const cookieHeader = await loginUser(user._id);

    const response = (await action({
      request: new Request("http://localhost/teams/" + team._id, {
        method: "PUT",
        headers: { cookie: cookieHeader },
        body: JSON.stringify({
          intent: "UPDATE_TEAM",
          payload: { name: "updated" },
        }),
      }),
      params: { teamId: team._id },
    } as any)) as any;

    const result = response.data;

    expect(result.success).toBe(true);
    expect(result.data._id).toBe(team._id);
    expect(result.data.name).toBe("updated");

    const retrieved = await TeamService.findById(team._id);
    expect(retrieved?.name).toBe("updated");
  });

  it("rejects updates by a non-admin team member", async () => {
    const team = await TeamService.create({ name: "original" });
    const user = await UserService.create({
      username: "member",
      role: "USER",
      teams: [{ team: team._id, role: "MEMBER" }],
    });

    const cookieHeader = await loginUser(user._id);

    const response = (await action({
      request: new Request("http://localhost/teams/" + team._id, {
        method: "PUT",
        headers: { cookie: cookieHeader },
        body: JSON.stringify({
          intent: "UPDATE_TEAM",
          payload: { name: "hijack" },
        }),
      }),
      params: { teamId: team._id },
    } as any)) as any;

    expect(response.init?.status).toBe(403);
    const retrieved = await TeamService.findById(team._id);
    expect(retrieved?.name).toBe("original");
  });

  it("only updates the team identified by params.teamId, ignoring any client-supplied id", async () => {
    const myTeam = await TeamService.create({ name: "mine" });
    const otherTeam = await TeamService.create({ name: "other" });
    const user = await UserService.create({
      username: "admin",
      role: "USER",
      teams: [{ team: myTeam._id, role: "ADMIN" }],
    });

    const cookieHeader = await loginUser(user._id);

    await action({
      request: new Request("http://localhost/teams/" + myTeam._id, {
        method: "PUT",
        headers: { cookie: cookieHeader },
        body: JSON.stringify({
          intent: "UPDATE_TEAM",
          entityId: otherTeam._id,
          payload: { name: "hijacked" },
        }),
      }),
      params: { teamId: myTeam._id },
    } as any);

    expect((await TeamService.findById(myTeam._id))?.name).toBe("hijacked");
    expect((await TeamService.findById(otherTeam._id))?.name).toBe("other");
  });
});
