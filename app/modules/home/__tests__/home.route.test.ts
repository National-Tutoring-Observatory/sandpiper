import { beforeEach, describe, expect, it } from "vitest";
import { TeamService } from "~/modules/teams/team";
import { UserService } from "~/modules/users/user";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import loginUser from "../../../../test/helpers/loginUser";
import { loader } from "../containers/home.route";

describe("home.route", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  describe("loader", () => {
    // Regression: logged-out visitors to "/" must reach the client
    // AuthenticationContainer, which renders the Splash page. The loader used
    // to call requireAuth and redirect them to /signup, so the splash never
    // showed. It must return data without throwing instead.
    it("returns splash data without redirecting when there is no session cookie", async () => {
      const result = (await loader({
        request: new Request("http://localhost/"),
        params: {},
        context: {},
      } as any)) as any;

      expect(result).toEqual({ activeTeamId: null });
    });

    it("returns the personal team as active team for a logged-in user", async () => {
      const personal = await TeamService.create({
        name: "personal",
        isPersonal: true,
      });
      const other = await TeamService.create({ name: "other" });
      const user = await UserService.create({
        username: "u",
        teams: [
          { team: other._id, role: "ADMIN" },
          { team: personal._id, role: "ADMIN" },
        ],
      });

      const cookieHeader = await loginUser(user._id);
      const result = (await loader({
        request: new Request("http://localhost/", {
          headers: { cookie: cookieHeader },
        }),
        params: {},
        context: {},
      } as any)) as any;

      expect(result.activeTeamId).toBe(personal._id);
    });

    it("returns a null active team for a logged-in user with no teams", async () => {
      const user = await UserService.create({ username: "u", teams: [] });

      const cookieHeader = await loginUser(user._id);
      const result = (await loader({
        request: new Request("http://localhost/", {
          headers: { cookie: cookieHeader },
        }),
        params: {},
        context: {},
      } as any)) as any;

      expect(result.activeTeamId).toBeNull();
    });
  });
});
