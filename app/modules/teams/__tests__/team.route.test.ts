import { beforeEach, describe, expect, it } from "vitest";
import { UserService } from "~/modules/users/user";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import expectAuthRequired from "../../../../test/helpers/expectAuthRequired";
import loginUser from "../../../../test/helpers/loginUser";
import { loader } from "../containers/team.route";
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
