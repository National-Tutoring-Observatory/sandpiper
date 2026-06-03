import { beforeEach, describe, expect, it } from "vitest";
import { TeamService } from "~/modules/teams/team";
import { UserService } from "~/modules/users/user";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import loginUser from "../../../../test/helpers/loginUser";
import { action } from "../containers/teamCodebooks.route";

describe("teamCodebooks.route", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  describe("action - CREATE_CODEBOOK", () => {
    it("returns created codebook nested under data key", async () => {
      const team = await TeamService.create({ name: "test-team" });

      const user = await UserService.create({
        username: "admin",
        role: "SUPER_ADMIN",
        githubId: 1,
        teams: [{ team: team._id, role: "ADMIN" }],
      });

      const cookieHeader = await loginUser(user._id);

      const body = JSON.stringify({
        intent: "CREATE_CODEBOOK",
        payload: { name: "My Codebook", description: "test" },
      });

      const result = (await action({
        request: new Request("http://localhost/", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body,
        }),
        params: { teamId: team._id },
        unstable_pattern: "",
        context: {},
      } as any)) as any;

      expect(result.intent).toBe("CREATE_CODEBOOK");
      expect(result.data).toBeDefined();
      expect(result.data._id).toBeDefined();
      expect(result.data.productionVersion).toBe(1);
      expect(result.data.team).toBe(team._id);
    });
  });
});
