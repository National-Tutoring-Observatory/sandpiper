import { beforeEach, describe, expect, it, vi } from "vitest";
import { TeamService } from "~/modules/teams/team";
import { UserService } from "~/modules/users/user";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import loginUser from "../../../../test/helpers/loginUser";
import { BillingPlanService } from "../../billing/billingPlan";
import { StripeService } from "../../billing/stripe";
import { TeamBillingPlanService } from "../../billing/teamBillingPlan";
import { action } from "../containers/teamBilling.route";

vi.mock("../../billing/stripe", () => ({
  StripeService: {
    ensureCustomer: vi.fn(),
    createCheckoutSession: vi.fn(),
  },
}));

function buildActionRequest(
  cookieHeader: string,
  teamId: string,
  body: object,
) {
  return {
    request: new Request(`http://localhost/teams/${teamId}/billing`, {
      method: "POST",
      headers: {
        cookie: cookieHeader,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    }),
    params: { teamId },
  } as any;
}

describe("teamBilling.route action", () => {
  beforeEach(async () => {
    await clearDocumentDB();
    vi.clearAllMocks();
  });

  describe("SET_BILLING_USER", () => {
    it("rejects non-team-member as billing user", async () => {
      const admin = await UserService.create({
        username: "admin",
        role: "SUPER_ADMIN",
        teams: [],
      });
      const outsider = await UserService.create({
        username: "outsider",
        role: "USER",
        teams: [],
      });
      const team = await TeamService.create({ name: "Test Team" });
      const cookie = await loginUser(admin._id);

      const result: any = await action(
        buildActionRequest(cookie, team._id, {
          intent: "SET_BILLING_USER",
          payload: { userId: outsider._id },
        }),
      );

      expect(result.data.errors.general).toContain("not a member");
    });

    it("allows setting a team member as billing user", async () => {
      const admin = await UserService.create({
        username: "admin",
        role: "SUPER_ADMIN",
        teams: [],
      });
      const team = await TeamService.create({ name: "Test Team" });
      const member = await UserService.create({
        username: "member",
        role: "USER",
        teams: [{ team: team._id, role: "ADMIN" }],
      });

      const cookie = await loginUser(admin._id);

      const result: any = await action(
        buildActionRequest(cookie, team._id, {
          intent: "SET_BILLING_USER",
          payload: { userId: member._id },
        }),
      );

      expect(result.data.success).toBe(true);

      const updated = await TeamService.findById(team._id);
      expect(updated?.billingUser).toBe(member._id);
    });

    it("denies non-admin from setting billing user", async () => {
      const regular = await UserService.create({
        username: "regular",
        role: "USER",
        teams: [],
      });
      const team = await TeamService.create({ name: "Test Team" });
      const cookie = await loginUser(regular._id);

      const result: any = await action(
        buildActionRequest(cookie, team._id, {
          intent: "SET_BILLING_USER",
          payload: { userId: regular._id },
        }),
      );

      expect(result.data.errors.general).toContain("permission");
    });
  });

  describe("ASSIGN_PLAN", () => {
    it("allows super admin to assign a plan", async () => {
      const admin = await UserService.create({
        username: "admin",
        role: "SUPER_ADMIN",
        teams: [],
      });
      const team = await TeamService.create({ name: "Test Team" });
      const plan = await BillingPlanService.create({
        name: "Premium",
        markupRate: 2.0,
        isDefault: false,
      });
      const cookie = await loginUser(admin._id);

      const result: any = await action(
        buildActionRequest(cookie, team._id, {
          intent: "ASSIGN_PLAN",
          payload: { planId: plan._id },
        }),
      );

      expect(result.data.success).toBe(true);

      const assignment = await TeamBillingPlanService.findByTeam(team._id);
      expect(assignment).not.toBeNull();
      expect(assignment!.plan).toBe(plan._id);
    });

    it("allows super admin to change an existing plan", async () => {
      const admin = await UserService.create({
        username: "admin",
        role: "SUPER_ADMIN",
        teams: [],
      });
      const team = await TeamService.create({ name: "Test Team" });
      const plan1 = await BillingPlanService.create({
        name: "Standard",
        markupRate: 1.5,
        isDefault: true,
      });
      const plan2 = await BillingPlanService.create({
        name: "Premium",
        markupRate: 2.0,
        isDefault: false,
      });
      await TeamBillingPlanService.assignPlan(team._id, plan1._id);
      const cookie = await loginUser(admin._id);

      const result: any = await action(
        buildActionRequest(cookie, team._id, {
          intent: "ASSIGN_PLAN",
          payload: { planId: plan2._id },
        }),
      );

      expect(result.data.success).toBe(true);

      // Reassignment is scheduled for next month — current plan stays plan1
      const current = await TeamBillingPlanService.findByTeam(team._id);
      expect(current!.plan).toBe(plan1._id);
      // plan2 is pending for next month
      const pending = await TeamBillingPlanService.getPendingPlanChange(
        team._id,
      );
      expect(pending!.plan.name).toBe("Premium");
    });

    it("denies non-super-admin from assigning a plan", async () => {
      const regular = await UserService.create({
        username: "regular",
        role: "USER",
        teams: [],
      });
      const team = await TeamService.create({ name: "Test Team" });
      const cookie = await loginUser(regular._id);

      const result: any = await action(
        buildActionRequest(cookie, team._id, {
          intent: "ASSIGN_PLAN",
          payload: { planId: "some-plan-id" },
        }),
      );

      expect(result.data.errors.general).toContain("super admins");
    });
  });

  describe("ADD_CREDITS", () => {
    it("denies billing user from adding credits", async () => {
      const team = await TeamService.create({ name: "Test Team" });
      const billingUser = await UserService.create({
        username: "billing",
        role: "USER",
        teams: [{ team: team._id, role: "ADMIN" }],
      });
      await TeamService.updateById(team._id, { billingUser: billingUser._id });

      const cookie = await loginUser(billingUser._id);

      const result: any = await action(
        buildActionRequest(cookie, team._id, {
          intent: "ADD_CREDITS",
          payload: {
            amount: 50,
            note: "Test top-up",
            idempotencyKey: "admin-credit:denied-billing-user",
          },
        }),
      );

      expect(result.init?.status).toBe(403);
      expect(result.data.errors.general).toContain("permission");
    });

    it("allows super admin to add credits", async () => {
      const admin = await UserService.create({
        username: "admin",
        role: "SUPER_ADMIN",
        teams: [],
      });
      const team = await TeamService.create({ name: "Test Team" });
      const cookie = await loginUser(admin._id);

      const result: any = await action(
        buildActionRequest(cookie, team._id, {
          intent: "ADD_CREDITS",
          payload: {
            amount: 100,
            idempotencyKey: "admin-credit:super-admin-success",
          },
        }),
      );

      expect(result.data.success).toBe(true);
    });

    it("denies regular members from adding credits", async () => {
      const team = await TeamService.create({ name: "Test Team" });
      const member = await UserService.create({
        username: "member",
        role: "USER",
        teams: [{ team: team._id, role: "ADMIN" }],
      });
      const cookie = await loginUser(member._id);

      const result: any = await action(
        buildActionRequest(cookie, team._id, {
          intent: "ADD_CREDITS",
          payload: {
            amount: 50,
            idempotencyKey: "admin-credit:member-denied",
          },
        }),
      );

      expect(result.data.errors.general).toContain("permission");
    });

    it("rejects invalid amount", async () => {
      const admin = await UserService.create({
        username: "admin",
        role: "SUPER_ADMIN",
        teams: [],
      });
      const team = await TeamService.create({ name: "Test Team" });
      const cookie = await loginUser(admin._id);

      const result: any = await action(
        buildActionRequest(cookie, team._id, {
          intent: "ADD_CREDITS",
          payload: {
            amount: "not-a-number",
            idempotencyKey: "admin-credit:invalid-amount",
          },
        }),
      );

      expect(result.data.errors.general).toContain("Invalid");
    });

    it("rejects non-integer amount", async () => {
      const admin = await UserService.create({
        username: "admin",
        role: "SUPER_ADMIN",
        teams: [],
      });
      const team = await TeamService.create({ name: "Test Team" });
      const cookie = await loginUser(admin._id);

      const result: any = await action(
        buildActionRequest(cookie, team._id, {
          intent: "ADD_CREDITS",
          payload: {
            amount: 10.5,
            idempotencyKey: "admin-credit:non-integer",
          },
        }),
      );

      expect(result.data.errors.general).toContain("whole dollar");
    });

    it("rejects null amount", async () => {
      const admin = await UserService.create({
        username: "admin",
        role: "SUPER_ADMIN",
        teams: [],
      });
      const team = await TeamService.create({ name: "Test Team" });
      const cookie = await loginUser(admin._id);

      const result: any = await action(
        buildActionRequest(cookie, team._id, {
          intent: "ADD_CREDITS",
          payload: {
            amount: null,
            idempotencyKey: "admin-credit:null-amount",
          },
        }),
      );

      expect(result.data.errors.general).toContain("Invalid");
    });

    it("rejects missing idempotency key", async () => {
      const admin = await UserService.create({
        username: "admin",
        role: "SUPER_ADMIN",
        teams: [],
      });
      const team = await TeamService.create({ name: "Test Team" });
      const cookie = await loginUser(admin._id);

      const result: any = await action(
        buildActionRequest(cookie, team._id, {
          intent: "ADD_CREDITS",
          payload: { amount: 50 },
        }),
      );

      expect(result.init?.status).toBe(400);
      expect(result.data.errors.general).toContain("request key");
    });
  });

  describe("INITIATE_TOPUP", () => {
    it("returns an error when billing is disabled", async () => {
      const original = process.env.BILLING_ENABLED;
      delete process.env.BILLING_ENABLED;

      const team = await TeamService.create({ name: "Test Team" });
      const billingUser = await UserService.create({
        username: "billing",
        role: "USER",
        teams: [{ team: team._id, role: "MEMBER" }],
      });
      await TeamService.updateById(team._id, { billingUser: billingUser._id });
      const cookie = await loginUser(billingUser._id);

      const result: any = await action(
        buildActionRequest(cookie, team._id, {
          intent: "INITIATE_TOPUP",
          payload: { amount: 50 },
        }),
      );

      expect(result.data.errors.general).toContain("Billing is not enabled");

      process.env.BILLING_ENABLED = original;
    });

    it("allows billing user to initiate top up", async () => {
      const original = process.env.BILLING_ENABLED;
      process.env.BILLING_ENABLED = "true";

      vi.mocked(StripeService.ensureCustomer).mockResolvedValue("cus_test_123");
      vi.mocked(StripeService.createCheckoutSession).mockResolvedValue({
        url: "https://checkout.stripe.com/test-session",
      } as any);

      const team = await TeamService.create({ name: "Test Team" });
      const billingUser = await UserService.create({
        username: "billing",
        role: "USER",
        teams: [{ team: team._id, role: "MEMBER" }],
      });
      await TeamService.updateById(team._id, { billingUser: billingUser._id });
      const cookie = await loginUser(billingUser._id);

      const result: any = await action(
        buildActionRequest(cookie, team._id, {
          intent: "INITIATE_TOPUP",
          payload: { amount: 50 },
        }),
      );

      expect(result.data.success).toBe(true);
      expect(result.data.intent).toBe("INITIATE_TOPUP");
      expect(result.data.checkoutUrl).toBe(
        "https://checkout.stripe.com/test-session",
      );
      expect(StripeService.ensureCustomer).toHaveBeenCalledWith(
        expect.objectContaining({ _id: team._id }),
      );
      expect(StripeService.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: "cus_test_123",
          amount: 50,
          metadata: { teamId: team._id, userId: billingUser._id.toString() },
        }),
      );

      process.env.BILLING_ENABLED = original;
    });

    it("allows team admins to initiate top up", async () => {
      const original = process.env.BILLING_ENABLED;
      process.env.BILLING_ENABLED = "true";

      vi.mocked(StripeService.ensureCustomer).mockResolvedValue("cus_test_456");
      vi.mocked(StripeService.createCheckoutSession).mockResolvedValue({
        url: "https://checkout.stripe.com/admin-session",
      } as any);

      const team = await TeamService.create({ name: "Test Team" });
      const admin = await UserService.create({
        username: "teamadmin",
        role: "USER",
        teams: [{ team: team._id, role: "ADMIN" }],
      });
      const cookie = await loginUser(admin._id);

      const result: any = await action(
        buildActionRequest(cookie, team._id, {
          intent: "INITIATE_TOPUP",
          payload: { amount: 50 },
        }),
      );

      expect(result.data.success).toBe(true);
      expect(result.data.intent).toBe("INITIATE_TOPUP");
      expect(result.data.checkoutUrl).toBe(
        "https://checkout.stripe.com/admin-session",
      );
      expect(StripeService.ensureCustomer).toHaveBeenCalledWith(
        expect.objectContaining({ _id: team._id }),
      );
      expect(StripeService.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: "cus_test_456",
          amount: 50,
          metadata: { teamId: team._id, userId: admin._id.toString() },
        }),
      );

      process.env.BILLING_ENABLED = original;
    });

    it("denies regular members from initiating top up", async () => {
      const team = await TeamService.create({ name: "Test Team" });
      const member = await UserService.create({
        username: "member",
        role: "USER",
        teams: [{ team: team._id, role: "MEMBER" }],
      });
      const cookie = await loginUser(member._id);

      const result: any = await action(
        buildActionRequest(cookie, team._id, {
          intent: "INITIATE_TOPUP",
          payload: { amount: 50 },
        }),
      );

      expect(result.init?.status).toBe(403);
      expect(result.data.errors.general).toContain("permission");
    });

    it("denies non-team users from initiating top up", async () => {
      const team = await TeamService.create({ name: "Test Team" });
      const outsider = await UserService.create({
        username: "outsider",
        role: "USER",
        teams: [],
      });
      const cookie = await loginUser(outsider._id);

      const result: any = await action(
        buildActionRequest(cookie, team._id, {
          intent: "INITIATE_TOPUP",
          payload: { amount: 50 },
        }),
      );

      expect(result.init?.status).toBe(403);
      expect(result.data.errors.general).toContain("permission");
    });
  });
});
