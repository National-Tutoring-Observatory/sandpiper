import { beforeEach, describe, expect, it } from "vitest";
import { BillingPlanService } from "~/modules/billing/billingPlan";
import { TeamBillingBalanceService } from "~/modules/billing/teamBillingBalance";
import { TeamBillingPlanService } from "~/modules/billing/teamBillingPlan";
import { UserService } from "~/modules/users/user";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import expectAuthRequired from "../../../../test/helpers/expectAuthRequired";
import loginUser from "../../../../test/helpers/loginUser";
import { loader } from "../containers/teams.route";
import { TeamService } from "../team";

describe("teams.route", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  describe("loader", () => {
    it("redirects to / when there is no session cookie", async () => {
      await expectAuthRequired(() =>
        loader({
          request: new Request("http://localhost/admin/teams"),
          params: {},
        } as never),
      );
    });

    it("redirects non-super-admin users to /", async () => {
      const team1 = await TeamService.create({ name: "team 1" });
      const user = await UserService.create({
        username: "user1",
        role: "USER",
        teams: [{ team: team1._id, role: "ADMIN" }],
      });

      const cookieHeader = await loginUser(user._id);

      const result = await loader({
        request: new Request("http://localhost/admin/teams", {
          headers: { cookie: cookieHeader },
        }),
        params: {},
      } as never);

      expect(result).toBeInstanceOf(Response);
      expect((result as Response).status).toBe(302);
      expect((result as Response).headers.get("Location")).toBe("/");
    });

    it("returns all teams for super admin", async () => {
      const team1 = await TeamService.create({ name: "team 1" });
      const team2 = await TeamService.create({ name: "team 2" });

      const admin = await UserService.create({
        username: "admin",
        role: "SUPER_ADMIN",
        teams: [],
      });

      const cookieHeader = await loginUser(admin._id);

      const result = (await loader({
        request: new Request("http://localhost/admin/teams", {
          headers: { cookie: cookieHeader },
        }),
        params: {},
      } as never)) as { teams: { data: { _id: string }[] } };

      expect(result.teams.data).toHaveLength(2);
      expect(result.teams.data.map((t) => t._id)).toContain(team1._id);
      expect(result.teams.data.map((t) => t._id)).toContain(team2._id);
    });

    it("returns balances for each team when user is super admin", async () => {
      const plan = await BillingPlanService.create({
        name: "Standard",
        markupRate: 1,
        isDefault: true,
      });

      const admin = await UserService.create({
        username: "admin",
        role: "SUPER_ADMIN",
        teams: [],
      });

      const team1 = await TeamService.create({ name: "team 1" });
      const team2 = await TeamService.create({ name: "team 2" });

      await TeamBillingPlanService.assignPlan(team1._id, plan._id);
      await TeamBillingPlanService.assignPlan(team2._id, plan._id);
      await TeamBillingBalanceService.ensureInitialized(team1._id, 50);

      const cookieHeader = await loginUser(admin._id);

      const result = (await loader({
        request: new Request("http://localhost/admin/teams", {
          headers: { cookie: cookieHeader },
        }),
        params: {},
      } as never)) as { balances: Record<string, number> };

      expect(result.balances).toBeDefined();
      expect(result.balances[team1._id]).toBe(50);
      expect(result.balances[team2._id]).toBe(0);
    });
  });
});
