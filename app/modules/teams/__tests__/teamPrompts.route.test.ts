import { beforeEach, describe, expect, it } from "vitest";
import { TeamService } from "~/modules/teams/team";
import { UserService } from "~/modules/users/user";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import loginUser from "../../../../test/helpers/loginUser";
import { action } from "../containers/teamPrompts.route";

describe("teamPrompts.route", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  describe("action - CREATE_PROMPT", () => {
    it("returns created prompt nested under data key", async () => {
      const team = await TeamService.create({ name: "test-team" });

      const user = await UserService.create({
        username: "admin",
        role: "SUPER_ADMIN",
        githubId: 1,
        teams: [{ team: team._id, role: "ADMIN" }],
      });

      const cookieHeader = await loginUser(user._id);

      const body = JSON.stringify({
        intent: "CREATE_PROMPT",
        payload: { name: "My Prompt", annotationType: "PER_UTTERANCE" },
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

      expect(result.intent).toBe("CREATE_PROMPT");
      expect(result.data).toBeDefined();
      expect(result.data._id).toBeDefined();
      expect(result.data.productionVersion).toBe(1);
    });
  });
});
