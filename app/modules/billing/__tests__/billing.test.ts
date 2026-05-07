import mongoose, { Types } from "mongoose";
import { beforeEach, describe, expect, it } from "vitest";
import seedLegacyBillingBaselinesMigration from "~/migrations/20260421172000-seed-legacy-billing-baselines";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import markLegacyBillingRowsMigration from "../../../migrations/20260421171000-mark-legacy-billing-rows";
import { TeamService } from "../../teams/team";
import { BillingLedgerEntryService } from "../billingLedgerEntry";
import { BillingPlanService } from "../billingPlan";
import { TeamBillingService } from "../teamBilling";
import { TeamBillingBalanceService } from "../teamBillingBalance";
import { TeamBillingPlanService } from "../teamBillingPlan";

describe("Billing", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  const teamId = new Types.ObjectId().toString();
  const userId = new Types.ObjectId().toString();

  async function createBackdatedPlanAssignment(
    assignedTeamId: string,
    {
      markupRate = 1.5,
      isDefault = false,
      name = "Standard",
    }: {
      markupRate?: number;
      isDefault?: boolean;
      name?: string;
    } = {},
  ) {
    const plan = await BillingPlanService.create({
      name,
      markupRate,
      isDefault,
    });
    await TeamBillingPlanService.assignPlanAt(
      assignedTeamId,
      plan._id,
      new Date(0),
    );
    return plan;
  }

  async function seedDefaultPlan() {
    return createBackdatedPlanAssignment(teamId, { isDefault: true });
  }

  async function getDb() {
    if (!mongoose.connection.db) {
      throw new Error("Database connection not available");
    }

    return mongoose.connection.db;
  }

  describe("BillingPlanService", () => {
    it("creates and finds a billing plan", async () => {
      const plan = await BillingPlanService.create({
        name: "Standard",
        markupRate: 1.5,
        isDefault: true,
      });

      expect(plan._id).toBeDefined();
      expect(plan.name).toBe("Standard");
      expect(plan.markupRate).toBe(1.5);
      expect(plan.isDefault).toBe(true);
    });

    it("finds default plan", async () => {
      await BillingPlanService.create({
        name: "Custom",
        markupRate: 2.0,
        isDefault: false,
      });
      await BillingPlanService.create({
        name: "Standard",
        markupRate: 1.5,
        isDefault: true,
      });

      const defaultPlan = await BillingPlanService.findDefault();
      expect(defaultPlan?.name).toBe("Standard");
      expect(defaultPlan?.isDefault).toBe(true);
    });
  });

  describe("TeamBillingService", () => {
    it("reads current balance from TeamBillingBalance", async () => {
      await seedDefaultPlan();

      await TeamBillingBalanceService.ensureInitialized(teamId, 42);

      const balance = await TeamBillingService.getBalance(teamId);
      expect(balance).toBe(42);
    });

    it("returns 0 when no TeamBillingBalance exists", async () => {
      const balance = await TeamBillingService.getBalance(teamId);
      expect(balance).toBe(0);
    });

    it("ignores legacy credits and costs for current balance", async () => {
      await seedDefaultPlan();
      await TeamBillingBalanceService.ensureInitialized(teamId, -7);

      const db = await getDb();
      await db.collection("teamcredits").insertOne({
        team: new Types.ObjectId(teamId),
        amount: 10,
        addedBy: new Types.ObjectId(userId),
        createdAt: new Date(),
      });
      await db.collection("llmcosts").insertOne({
        team: new Types.ObjectId(teamId),
        model: "claude-opus",
        source: "annotation:per-session",
        inputTokens: 500,
        outputTokens: 100,
        cost: 20,
        providerCost: 16,
        createdAt: new Date(),
      });

      const balance = await TeamBillingService.getBalance(teamId);
      expect(balance).toBe(-7);
    });

    it("returns full balance summary with TeamBillingBalance as the balance field", async () => {
      await seedDefaultPlan();
      await TeamBillingService.applyCredit({
        teamId,
        amount: 100,
        addedBy: userId,
        source: "admin-credit",
        sourceId: "admin-credit:test-summary-balance",
        idempotencyKey: "admin-credit:test-summary-balance",
      });

      await TeamBillingService.applyDebit({
        teamId,
        userId,
        model: "claude-opus",
        source: "annotation:per-session",
        sourceId: "session:test-summary-balance",
        inputTokens: 500,
        outputTokens: 100,
        rawAmount: 10,
        providerCost: 8,
        idempotencyKey: "llm-cost:test-summary-balance",
      });

      const balance = await TeamBillingBalanceService.findByTeam(teamId);
      const lastLedgerEntryAt = balance?.lastLedgerEntryAt
        ? new Date(balance.lastLedgerEntryAt)
        : null;

      await TeamBillingBalanceService.reconcileToSnapshot({
        teamId,
        expectedBalance: 42,
        lastLedgerEntryAt,
        currentVersion: balance?.version,
      });

      const summary = await TeamBillingService.getBalanceSummary(teamId);
      expect(summary).not.toBeNull();
      expect(summary!.balance).toBe(42);
      expect(summary!.credits).toBe(100);
      expect(summary!.costs).toBe(10);
      expect(summary!.markedUpCosts).toBe(15);
      expect(summary!.plan.name).toBe("Standard");
    });

    it("returns null summary when no plan assigned", async () => {
      const summary = await TeamBillingService.getBalanceSummary(teamId);
      expect(summary).toBeNull();
    });

    it("returns summary with zero totals when no TeamBillingBalance exists", async () => {
      await seedDefaultPlan();

      await TeamBillingService.applyCredit({
        teamId,
        amount: 100,
        addedBy: userId,
        source: "admin-credit",
        sourceId: "admin-credit:test-missing-balance-summary",
        idempotencyKey: "admin-credit:test-missing-balance-summary",
      });

      await TeamBillingBalanceService.deleteByTeam(teamId);

      const summary = await TeamBillingService.getBalanceSummary(teamId);

      expect(summary).not.toBeNull();
      expect(summary!.balance).toBe(0);
      expect(summary!.credits).toBe(0);
      expect(summary!.costs).toBe(0);
      expect(summary!.markedUpCosts).toBe(0);
    });

    describe("setupTeamBilling", () => {
      it("assigns the default billing plan to the team", async () => {
        await BillingPlanService.create({
          name: "Standard",
          markupRate: 1.5,
          isDefault: true,
        });

        await TeamBillingService.setupTeamBilling(teamId);

        const assignment = await TeamBillingPlanService.findByTeam(teamId);
        expect(assignment).not.toBeNull();
      });

      it("does not create any credits", async () => {
        await BillingPlanService.create({
          name: "Standard",
          markupRate: 1.5,
          isDefault: true,
        });

        await TeamBillingService.setupTeamBilling(teamId);

        const ledger = await BillingLedgerEntryService.findByTeam(teamId);
        expect(ledger).toHaveLength(0);
      });

      it("does nothing when no default plan exists", async () => {
        await TeamBillingService.setupTeamBilling(teamId);

        const assignment = await TeamBillingPlanService.findByTeam(teamId);
        expect(assignment).toBeNull();
      });
    });

    describe("assignInitialCredits", () => {
      it("assigns 20 credits when billing is disabled", async () => {
        const original = process.env.BILLING_ENABLED;
        delete process.env.BILLING_ENABLED;

        await TeamBillingService.assignInitialCredits(teamId, userId);

        const ledger = await BillingLedgerEntryService.findByTeam(teamId);
        expect(ledger).toHaveLength(1);
        expect(ledger[0].amount).toBe(20);

        process.env.BILLING_ENABLED = original;
      });

      it("assigns 10 credits when billing is enabled", async () => {
        const original = process.env.BILLING_ENABLED;
        process.env.BILLING_ENABLED = "true";

        await TeamBillingService.assignInitialCredits(teamId, userId);

        const ledger = await BillingLedgerEntryService.findByTeam(teamId);
        expect(ledger).toHaveLength(1);
        expect(ledger[0].amount).toBe(10);

        process.env.BILLING_ENABLED = original;
      });

      it("records the credit with the correct note and addedBy", async () => {
        delete process.env.BILLING_ENABLED;

        await TeamBillingService.assignInitialCredits(teamId, userId);

        const ledger = await BillingLedgerEntryService.findByTeam(teamId);
        expect(ledger).toHaveLength(1);
        expect(ledger[0].source).toBe("initial-credit");
        expect(ledger[0].metadata).toMatchObject({
          note: "Initial credits",
          addedBy: userId,
        });

        const balance = await TeamBillingBalanceService.findByTeam(teamId);
        expect(balance?.availableBalance).toBeGreaterThan(0);
      });
    });
  });

  describe("legacy baseline migration", () => {
    async function createTeam() {
      return TeamService.create({ name: "Billing Migration Team" });
    }

    async function insertLegacyCredit(teamId: string, amount: number) {
      const db = await getDb();
      await db.collection("teamcredits").insertOne({
        team: new Types.ObjectId(teamId),
        amount,
        addedBy: new Types.ObjectId(userId),
        createdAt: new Date(),
      });
    }

    async function insertLegacyCost(teamId: string, cost: number) {
      const db = await getDb();
      await db.collection("llmcosts").insertOne({
        team: new Types.ObjectId(teamId),
        model: "claude-opus",
        source: "annotation:per-session",
        inputTokens: 100,
        outputTokens: 50,
        cost,
        providerCost: 8,
        createdAt: new Date(),
      });
    }

    it("seeds one baseline ledger entry and balance from legacy rows", async () => {
      const team = await createTeam();
      await createBackdatedPlanAssignment(team._id, { markupRate: 1.5 });

      await insertLegacyCredit(team._id, 100);
      await insertLegacyCost(team._id, 10);

      const db = await getDb();
      await markLegacyBillingRowsMigration.up(db);
      await seedLegacyBillingBaselinesMigration.up(db);
      await seedLegacyBillingBaselinesMigration.up(db);

      const ledger = await BillingLedgerEntryService.findByTeam(team._id);
      expect(ledger).toHaveLength(1);
      expect(ledger[0].source).toBe("legacy-migration");
      expect(ledger[0].idempotencyKey).toBe(`legacy-balance:${team._id}`);
      expect(ledger[0].amount).toBe(85);

      const balance = await TeamBillingBalanceService.findByTeam(team._id);
      expect(balance?.availableBalance).toBe(85);
    });

    it("preserves existing ledger deltas when the balance is seeded late", async () => {
      const team = await createTeam();
      await createBackdatedPlanAssignment(team._id, { markupRate: 1.5 });

      await insertLegacyCredit(team._id, 100);
      await insertLegacyCost(team._id, 10);

      const db = await getDb();
      await markLegacyBillingRowsMigration.up(db);
      await TeamBillingService.applyCredit({
        teamId: team._id,
        amount: 20,
        addedBy: userId,
        source: "admin-credit",
        sourceId: "manual-topup-1",
        idempotencyKey: "admin-credit:manual-topup-1",
      });
      await TeamBillingBalanceService.deleteByTeam(team._id);

      await seedLegacyBillingBaselinesMigration.up(db);

      const ledger = await BillingLedgerEntryService.findByTeam(team._id);
      expect(ledger).toHaveLength(2);

      const balance = await TeamBillingBalanceService.findByTeam(team._id);
      expect(balance?.availableBalance).toBe(105);
    });
  });
});
