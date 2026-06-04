import { beforeEach, describe, expect, it } from "vitest";
import { BillingLedgerEntryService } from "~/modules/billing/billingLedgerEntry";
import { BillingPlanService } from "~/modules/billing/billingPlan";
import { TeamBillingBalanceService } from "~/modules/billing/teamBillingBalance";
import { TeamBillingPlanService } from "~/modules/billing/teamBillingPlan";
import { UserService } from "~/modules/users/user";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import expectAuthRequired from "../../../../test/helpers/expectAuthRequired";
import loginUser from "../../../../test/helpers/loginUser";
import { action, loader } from "../containers/teams.route";
import { TeamService } from "../team";

describe("teams.route", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  describe("loader", () => {
    it("redirects to / when there is no session cookie", async () => {
      await expectAuthRequired(() =>
        loader({
          request: new Request("http://localhost/teams"),
          params: {},
        } as any),
      );
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
        request: new Request("http://localhost/teams", {
          headers: { cookie: cookieHeader },
        }),
        params: {},
      } as any)) as any;

      expect(result.teams.data).toHaveLength(2);
      expect(result.teams.data.map((t: any) => t._id)).toContain(team1._id);
      expect(result.teams.data.map((t: any) => t._id)).toContain(team2._id);
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
        request: new Request("http://localhost/teams", {
          headers: { cookie: cookieHeader },
        }),
        params: {},
      } as any)) as any;

      expect(result.balances).toBeDefined();
      expect(result.balances[team1._id]).toBe(50);
      expect(result.balances[team2._id]).toBe(0);
    });

    it("returns empty balances for non-super admin", async () => {
      const team1 = await TeamService.create({ name: "team 1" });

      const user = await UserService.create({
        username: "user1",
        role: "USER",
        teams: [{ team: team1._id, role: "ADMIN" }],
      });

      const cookieHeader = await loginUser(user._id);

      const result = (await loader({
        request: new Request("http://localhost/teams", {
          headers: { cookie: cookieHeader },
        }),
        params: {},
      } as any)) as any;

      expect(result.balances).toEqual({});
    });

    it("returns only user's teams for regular user", async () => {
      const team1 = await TeamService.create({ name: "team 1" });
      await TeamService.create({ name: "team 2" });
      await TeamService.create({ name: "team 3" });

      const user = await UserService.create({
        username: "user1",
        role: "USER",
        teams: [{ team: team1._id, role: "ADMIN" }],
      });

      const cookieHeader = await loginUser(user._id);

      const result = (await loader({
        request: new Request("http://localhost/teams", {
          headers: { cookie: cookieHeader },
        }),
        params: {},
      } as any)) as any;

      expect(result.teams.data).toHaveLength(1);
      expect(result.teams.data[0]._id).toBe(team1._id);
    });
  });

  describe("action - CREATE_TEAM", () => {
    it("creates a team when user is super admin", async () => {
      const admin = await UserService.create({
        username: "admin",
        role: "SUPER_ADMIN",
      });

      const cookieHeader = await loginUser(admin._id);

      const response = (await action({
        request: new Request("http://localhost/teams", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({
            intent: "CREATE_TEAM",
            payload: { name: "new team" },
          }),
        }),
        params: {},
      } as any)) as any;

      const result = response.data;

      expect(result.success).toBe(true);
      expect(result.intent).toBe("CREATE_TEAM");
      expect(result.data._id).toBeDefined();
      expect(result.data.name).toBe("new team");

      const retrieved = await TeamService.findById(result.data._id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe("new team");

      const updatedAdmin = await UserService.findById(admin._id);
      expect(
        updatedAdmin?.teams.some(
          (t) => t.team === result.data._id && t.role === "ADMIN",
        ),
      ).toBe(true);
    });

    it("assigns the default billing plan to the new team", async () => {
      await BillingPlanService.create({
        name: "Standard",
        markupRate: 1.5,
        isDefault: true,
      });

      const admin = await UserService.create({
        username: "admin",
        role: "SUPER_ADMIN",
      });

      const cookieHeader = await loginUser(admin._id);

      const response = (await action({
        request: new Request("http://localhost/teams", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({
            intent: "CREATE_TEAM",
            payload: { name: "new team" },
          }),
        }),
        params: {},
      } as any)) as any;

      const teamId = response.data.data._id;
      const assignment = await TeamBillingPlanService.findByTeam(teamId);
      expect(assignment).toBeDefined();
    });

    it("does not assign credits to the new team", async () => {
      await BillingPlanService.create({
        name: "Standard",
        markupRate: 1.5,
        isDefault: true,
      });

      const admin = await UserService.create({
        username: "admin",
        role: "SUPER_ADMIN",
      });

      const cookieHeader = await loginUser(admin._id);

      const response = (await action({
        request: new Request("http://localhost/teams", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({
            intent: "CREATE_TEAM",
            payload: { name: "new team" },
          }),
        }),
        params: {},
      } as any)) as any;

      const teamId = response.data.data._id;
      const ledgerEntries = await BillingLedgerEntryService.findByTeam(teamId);
      expect(ledgerEntries).toHaveLength(0);
    });

    it("creates a team without a plan if no default plan exists", async () => {
      const admin = await UserService.create({
        username: "admin",
        role: "SUPER_ADMIN",
      });

      const cookieHeader = await loginUser(admin._id);

      const response = (await action({
        request: new Request("http://localhost/teams", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({
            intent: "CREATE_TEAM",
            payload: { name: "new team" },
          }),
        }),
        params: {},
      } as any)) as any;

      expect(response.data.success).toBe(true);
      const teamId = response.data.data._id;
      const assignment = await TeamBillingPlanService.findByTeam(teamId);
      expect(assignment).toBeNull();
    });

    it("returns error when team name is missing", async () => {
      const admin = await UserService.create({
        username: "admin",
        role: "SUPER_ADMIN",
      });

      const cookieHeader = await loginUser(admin._id);

      const response = (await action({
        request: new Request("http://localhost/teams", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({ intent: "CREATE_TEAM", payload: {} }),
        }),
        params: {},
      } as any)) as any;

      const result = response.data;

      expect(result.errors).toBeDefined();
      expect(result.errors.general).toMatch(/Team name is required/);
    });

    it("creates a team when user is a regular user", async () => {
      const user = await UserService.create({
        username: "user1",
        role: "USER",
        teams: [],
      });

      const cookieHeader = await loginUser(user._id);

      const response = (await action({
        request: new Request("http://localhost/teams", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({
            intent: "CREATE_TEAM",
            payload: { name: "my team" },
          }),
        }),
        params: {},
      } as any)) as any;

      const result = response.data;

      expect(result.success).toBe(true);
      expect(result.data.name).toBe("my team");
    });

    it("adds the regular user as ADMIN of the newly created team", async () => {
      const user = await UserService.create({
        username: "user1",
        role: "USER",
        teams: [],
      });

      const cookieHeader = await loginUser(user._id);

      const response = (await action({
        request: new Request("http://localhost/teams", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({
            intent: "CREATE_TEAM",
            payload: { name: "my team" },
          }),
        }),
        params: {},
      } as any)) as any;

      const teamId = response.data.data._id;
      const updated = await UserService.findById(user._id);
      expect(
        updated?.teams.some((t) => t.team === teamId && t.role === "ADMIN"),
      ).toBe(true);
    });
  });
});
