import mongoose, { Types } from "mongoose";
import { beforeEach, describe, expect, it } from "vitest";
import markLegacyMigration from "~/migrations/20260421171000-mark-legacy-billing-rows";
import seedBaselinesMigration from "~/migrations/20260421172000-seed-legacy-billing-baselines";
import expandMigration from "~/migrations/20260518120000-expand-legacy-billing-into-ledger";
import clearDocumentDB from "../../../test/helpers/clearDocumentDB";
import makeDate from "../../../test/helpers/makeDate";
import { BillingLedgerEntryService } from "../../modules/billing/billingLedgerEntry";
import { BillingPeriodService } from "../../modules/billing/billingPeriod";
import { BillingPlanService } from "../../modules/billing/billingPlan";
import { TeamBillingBalanceService } from "../../modules/billing/teamBillingBalance";
import { TeamBillingPlanService } from "../../modules/billing/teamBillingPlan";
import { TeamService } from "../../modules/teams/team";
import { UserService } from "../../modules/users/user";

async function getDb() {
  if (!mongoose.connection.db) throw new Error("No DB connection");
  return mongoose.connection.db;
}

async function createTeamWithPlan(markupRate = 1.5) {
  const owner = await UserService.create({
    username: `owner-${new Types.ObjectId()}`,
    teams: [],
  });
  const team = await TeamService.create({
    name: "Test Team",
    createdBy: owner._id,
  });
  const plan = await BillingPlanService.create({
    name: "Standard",
    markupRate,
    isDefault: false,
  });
  await TeamBillingPlanService.assignPlanAt(team._id, plan._id, new Date(0));
  return { team, owner };
}

async function insertLegacyCost(
  teamId: string,
  cost: number,
  createdAt: Date,
  extra: Record<string, unknown> = {},
) {
  const db = await getDb();
  const result = await db.collection("llmcosts").insertOne({
    team: new Types.ObjectId(teamId),
    model: "claude-opus",
    source: "annotation:per-session",
    sourceId: "session-123",
    inputTokens: 100,
    outputTokens: 50,
    cost,
    providerCost: cost * 0.8,
    createdAt,
    ...extra,
  });
  return result.insertedId;
}

async function insertLegacyCredit(
  teamId: string,
  amount: number,
  createdAt: Date,
) {
  const db = await getDb();
  const result = await db.collection("teamcredits").insertOne({
    team: new Types.ObjectId(teamId),
    amount,
    addedBy: new Types.ObjectId(),
    note: "Top-up",
    createdAt,
  });
  return result.insertedId;
}

async function runLegacyMigrationsAndExpand() {
  const db = await getDb();
  await markLegacyMigration.up(db);
  await seedBaselinesMigration.up(db);
  return expandMigration.up(db);
}

describe("expand-legacy-billing-into-ledger migration", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  describe("basic expansion", () => {
    it("creates individual debit entries for each llmcost record", async () => {
      const { team, owner } = await createTeamWithPlan(1.5);

      await insertLegacyCost(team._id, 10, makeDate(2026, 1, 15));
      await insertLegacyCost(team._id, 20, makeDate(2026, 2, 10));

      await runLegacyMigrationsAndExpand();

      const entries = await BillingLedgerEntryService.findByTeam(team._id);
      const debits = entries.filter((e) => e.direction === "debit");

      expect(debits).toHaveLength(2);
      expect(debits.map((d) => d.rawAmount).sort()).toEqual([10, 20]);
      expect(debits.every((d) => d.user === owner._id)).toBe(true);
    });

    it("creates individual credit entries for each teamcredit record", async () => {
      const { team } = await createTeamWithPlan();

      await insertLegacyCredit(team._id, 50, makeDate(2026, 1, 1));
      await insertLegacyCredit(team._id, 30, makeDate(2026, 2, 1));

      await runLegacyMigrationsAndExpand();

      const entries = await BillingLedgerEntryService.findByTeam(team._id);
      const credits = entries.filter((e) => e.direction === "credit");

      expect(credits).toHaveLength(2);
      expect(credits.map((c) => c.amount).sort()).toEqual([30, 50]);
    });

    it("applies the team markup rate to compute billedAmount", async () => {
      const { team } = await createTeamWithPlan(2.0);

      await insertLegacyCost(team._id, 10, makeDate(2026, 1, 15));

      await runLegacyMigrationsAndExpand();

      const entries = await BillingLedgerEntryService.findByTeam(team._id);
      const debit = entries.find((e) => e.direction === "debit");

      expect(debit?.rawAmount).toBe(10);
      expect(debit?.amount).toBe(20);
      expect(debit?.markupRateApplied).toBe(2.0);
    });

    it("preserves original createdAt on expanded entries", async () => {
      const { team } = await createTeamWithPlan();

      const costDate = makeDate(2026, 1, 15);
      const creditDate = makeDate(2026, 2, 1);
      await insertLegacyCost(team._id, 10, costDate);
      await insertLegacyCredit(team._id, 50, creditDate);

      await runLegacyMigrationsAndExpand();

      const entries = await BillingLedgerEntryService.findByTeam(team._id);
      const debit = entries.find((e) => e.direction === "debit");
      const credit = entries.find((e) => e.direction === "credit");

      expect(new Date(debit!.createdAt).getTime()).toBe(costDate.getTime());
      expect(new Date(credit!.createdAt).getTime()).toBe(creditDate.getTime());
    });

    it("carries over model, source, inputTokens, outputTokens, providerCost from llmcosts", async () => {
      const { team } = await createTeamWithPlan();

      await insertLegacyCost(team._id, 10, makeDate(2026, 1, 15), {
        model: "claude-sonnet",
        source: "verification:per-session",
        inputTokens: 200,
        outputTokens: 80,
        providerCost: 7.5,
      });

      await runLegacyMigrationsAndExpand();

      const entries = await BillingLedgerEntryService.findByTeam(team._id);
      const debit = entries.find((e) => e.direction === "debit");

      expect(debit?.model).toBe("claude-sonnet");
      expect(debit?.source).toBe("verification:per-session");
      expect(debit?.inputTokens).toBe(200);
      expect(debit?.outputTokens).toBe(80);
      expect(debit?.providerCost).toBe(7.5);
    });

    it("marks expanded entries as legacy", async () => {
      const { team } = await createTeamWithPlan();

      await insertLegacyCost(team._id, 10, makeDate(2026, 1, 15));
      await insertLegacyCredit(team._id, 50, makeDate(2026, 1, 1));

      await runLegacyMigrationsAndExpand();

      const entries = await BillingLedgerEntryService.findByTeam(team._id);
      expect(entries.every((e) => e.isLegacy)).toBe(true);
    });

    it("uses the oldest admin when createdBy is not set", async () => {
      const db = await getDb();

      const teamDoc = await db
        .collection("teams")
        .insertOne({ name: "No Owner Team" });
      const teamId = teamDoc.insertedId.toString();

      const admin = await UserService.create({
        username: "oldest-admin",
        teams: [{ team: teamId, role: "ADMIN" }],
      });

      const plan = await BillingPlanService.create({
        name: "Standard",
        markupRate: 1.5,
        isDefault: false,
      });
      await TeamBillingPlanService.assignPlanAt(teamId, plan._id, new Date(0));

      await insertLegacyCost(teamId, 10, makeDate(2026, 1, 15));
      await runLegacyMigrationsAndExpand();

      const entries = await BillingLedgerEntryService.findByTeam(teamId);
      const debit = entries.find((e) => e.direction === "debit");
      expect(debit?.user).toBe(admin._id);
    });
  });

  describe("carry-forward removal", () => {
    it("removes the legacy-balance carry-forward entry", async () => {
      const { team } = await createTeamWithPlan();

      await insertLegacyCredit(team._id, 100, makeDate(2026, 1, 1));
      await insertLegacyCost(team._id, 10, makeDate(2026, 1, 15));

      await runLegacyMigrationsAndExpand();

      const entries = await BillingLedgerEntryService.findByTeam(team._id);
      const carryForward = entries.find((e) => e.source === "legacy-migration");
      expect(carryForward).toBeUndefined();
    });
  });

  describe("balance integrity", () => {
    it("net balance is unchanged after expansion", async () => {
      const { team } = await createTeamWithPlan(1.5);

      await insertLegacyCredit(team._id, 100, makeDate(2026, 1, 1));
      await insertLegacyCost(team._id, 10, makeDate(2026, 1, 15));
      await insertLegacyCost(team._id, 20, makeDate(2026, 2, 10));

      const db = await getDb();
      await markLegacyMigration.up(db);
      await seedBaselinesMigration.up(db);

      const balanceBefore = await TeamBillingBalanceService.findByTeam(
        team._id,
      );

      await expandMigration.up(db);

      const balanceAfter = await TeamBillingBalanceService.findByTeam(team._id);

      expect(balanceAfter?.availableBalance).toBe(55); // 100 - (10 + 20) * 1.5
      expect(balanceAfter?.availableBalance).toBe(
        balanceBefore?.availableBalance,
      );
    });

    it("updates TeamBillingBalance running totals", async () => {
      const { team } = await createTeamWithPlan(1.5);

      await insertLegacyCredit(team._id, 100, makeDate(2026, 1, 1));
      await insertLegacyCost(team._id, 10, makeDate(2026, 1, 15));
      await insertLegacyCost(team._id, 20, makeDate(2026, 2, 10));

      await runLegacyMigrationsAndExpand();

      const balance = await TeamBillingBalanceService.findByTeam(team._id);

      expect(balance?.totalCredits).toBe(100);
      expect(balance?.totalRawCosts).toBe(30);
      expect(balance?.totalBilledCosts).toBe(45); // (10 + 20) * 1.5
    });
  });

  describe("idempotency", () => {
    it("does not create duplicate entries when run twice", async () => {
      const { team } = await createTeamWithPlan();

      await insertLegacyCost(team._id, 10, makeDate(2026, 1, 15));
      await insertLegacyCredit(team._id, 50, makeDate(2026, 1, 1));

      await runLegacyMigrationsAndExpand();

      const db = await getDb();
      await expandMigration.up(db);

      const entries = await BillingLedgerEntryService.findByTeam(team._id);
      const debits = entries.filter((e) => e.direction === "debit");
      const credits = entries.filter((e) => e.direction === "credit");

      expect(debits).toHaveLength(1);
      expect(credits).toHaveLength(1);
    });
  });

  describe("billing period recalculation", () => {
    it("backfills rawCost and billedAmount on a closed period", async () => {
      const { team } = await createTeamWithPlan(1.5);

      await insertLegacyCost(team._id, 10, makeDate(2026, 1, 15));
      await insertLegacyCredit(team._id, 100, makeDate(2026, 1, 1));

      const period = await BillingPeriodService.openPeriod(
        team._id,
        makeDate(2026, 1),
      );
      await BillingPeriodService.closePeriod(period);

      await runLegacyMigrationsAndExpand();

      const periods = await BillingPeriodService.findClosedByTeam(team._id);
      expect(periods).toHaveLength(1);
      expect(periods[0].rawCost).toBe(10);
      expect(periods[0].billedAmount).toBe(15);
      expect(periods[0].creditsAdded).toBe(100);
      expect(periods[0].closingBalance).toBe(85);
    });

    it("chains openingBalance correctly across multiple periods", async () => {
      const { team } = await createTeamWithPlan(1.5);

      // Jan: 100 credit, 10 cost → closing = 85
      await insertLegacyCredit(team._id, 100, makeDate(2026, 1, 1));
      await insertLegacyCost(team._id, 10, makeDate(2026, 1, 15));

      // Feb: 20 cost → closing = 85 - 30 = 55
      await insertLegacyCost(team._id, 20, makeDate(2026, 2, 10));

      const p1 = await BillingPeriodService.openPeriod(
        team._id,
        makeDate(2026, 1),
      );
      await BillingPeriodService.closePeriod(p1);

      const p2 = await BillingPeriodService.openPeriod(
        team._id,
        makeDate(2026, 2),
      );
      await BillingPeriodService.closePeriod(p2);

      await runLegacyMigrationsAndExpand();

      const periods = await BillingPeriodService.findClosedByTeam(team._id);
      const jan = periods.find((p) => new Date(p.startAt).getUTCMonth() === 0)!;
      const feb = periods.find((p) => new Date(p.startAt).getUTCMonth() === 1)!;

      expect(jan.closingBalance).toBe(85);
      expect(feb.openingBalance).toBe(85);
      expect(feb.rawCost).toBe(20);
      expect(feb.billedAmount).toBe(30);
      expect(feb.closingBalance).toBe(55);
    });

    it("does not touch periods for other teams", async () => {
      const { team } = await createTeamWithPlan();
      const { team: otherTeam } = await createTeamWithPlan();

      await insertLegacyCredit(team._id, 100, makeDate(2026, 1, 1));

      const otherPeriod = await BillingPeriodService.openPeriod(
        otherTeam._id,
        makeDate(2026, 1),
      );
      await BillingPeriodService.closePeriod(otherPeriod);

      await runLegacyMigrationsAndExpand();

      const otherPeriods = await BillingPeriodService.findClosedByTeam(
        otherTeam._id,
      );
      expect(otherPeriods[0].rawCost).toBe(0);
      expect(otherPeriods[0].billedAmount).toBe(0);
    });
  });

  describe("team isolation", () => {
    it("does not create ledger entries for other teams", async () => {
      const { team } = await createTeamWithPlan();
      const { team: otherTeam } = await createTeamWithPlan();

      await insertLegacyCost(team._id, 10, makeDate(2026, 1, 15));

      await runLegacyMigrationsAndExpand();

      const otherEntries = await BillingLedgerEntryService.findByTeam(
        otherTeam._id,
      );
      expect(otherEntries).toHaveLength(0);
    });
  });

  describe("teams with no billing plan", () => {
    it("skips teams with no billing plan assigned", async () => {
      const db = await getDb();

      const teamDoc = await db
        .collection("teams")
        .insertOne({ name: "No Plan Team" });
      const teamId = teamDoc.insertedId.toString();

      await insertLegacyCost(teamId, 10, makeDate(2026, 1, 15));

      const result = await expandMigration.up(db);

      expect(result.success).toBe(true);
      const entries = await BillingLedgerEntryService.findByTeam(teamId);
      expect(entries).toHaveLength(0);
    });
  });

  describe("migration result stats", () => {
    it("reports correct counts", async () => {
      const { team } = await createTeamWithPlan();

      await insertLegacyCost(team._id, 10, makeDate(2026, 1, 15));
      await insertLegacyCost(team._id, 20, makeDate(2026, 2, 10));
      await insertLegacyCredit(team._id, 100, makeDate(2026, 1, 1));

      const db = await getDb();
      await markLegacyMigration.up(db);
      await seedBaselinesMigration.up(db);
      const result = await expandMigration.up(db);

      expect(result.success).toBe(true);
      expect(result.stats?.insertedDebits).toBe(2);
      expect(result.stats?.insertedCredits).toBe(1);
      expect(result.stats?.deletedCarryForwards).toBe(1);
    });
  });
});
