import { Types } from "mongoose";
import { beforeEach, describe, expect, it } from "vitest";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import { BillingPeriodService } from "../billingPeriod";
import { BillingPlanService } from "../billingPlan";
import { TeamBillingService } from "../teamBilling";
import { TeamBillingPlanService } from "../teamBillingPlan";

describe("getBillingReportingSummary", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  async function seedPlan(teamId: string) {
    const plan = await BillingPlanService.create({
      name: "Standard",
      markupRate: 1.5,
      isDefault: false,
    });
    await TeamBillingPlanService.assignPlanAt(teamId, plan._id, new Date(0));
    return plan;
  }

  it("returns ledger-based balance summary", async () => {
    const teamId = new Types.ObjectId().toString();
    const userId = new Types.ObjectId().toString();
    await seedPlan(teamId);

    await TeamBillingService.applyCredit({
      teamId,
      amount: 100,
      addedBy: userId,
      source: "admin-credit",
      sourceId: "admin-credit:test-summary",
      idempotencyKey: "admin-credit:test-summary",
    });

    await TeamBillingService.applyDebit({
      teamId,
      userId,
      model: "claude-opus",
      source: "annotation:per-session",
      sourceId: "session-1",
      inputTokens: 100,
      outputTokens: 50,
      rawAmount: 10,
      providerCost: 8,
      idempotencyKey: "llm-cost:test-summary",
    });

    const summary = await TeamBillingService.getReportingSummary(teamId);

    expect(summary.balanceSummary).not.toBeNull();
    expect(summary.balanceSummary?.balance).toBe(85);
    expect(summary.balanceSummary?.credits).toBe(100);
    expect(summary.balanceSummary?.costs).toBe(10);
    expect(summary.balanceSummary?.markedUpCosts).toBe(15);
  });

  it("builds monthly closed period reporting from debit ledger entries", async () => {
    const teamId = new Types.ObjectId().toString();
    const userId = new Types.ObjectId().toString();
    await seedPlan(teamId);

    await TeamBillingService.applyCredit({
      teamId,
      amount: 200,
      addedBy: userId,
      createdAt: new Date("2025-01-05T00:00:00.000Z"),
      source: "admin-credit",
      sourceId: "admin-credit:test-periods",
      idempotencyKey: "admin-credit:test-periods",
    });

    await TeamBillingService.applyDebit({
      teamId,
      userId,
      model: "claude-opus",
      source: "annotation:per-session",
      sourceId: "session-jan",
      createdAt: new Date("2025-01-15T00:00:00.000Z"),
      inputTokens: 100,
      outputTokens: 50,
      rawAmount: 10,
      providerCost: 8,
      idempotencyKey: "llm-cost:test-periods-jan",
    });

    await TeamBillingService.applyDebit({
      teamId,
      userId,
      model: "claude-opus",
      source: "annotation:per-session",
      sourceId: "session-feb",
      createdAt: new Date("2025-02-15T00:00:00.000Z"),
      inputTokens: 100,
      outputTokens: 50,
      rawAmount: 20,
      providerCost: 16,
      idempotencyKey: "llm-cost:test-periods-feb",
    });

    const januaryPeriod = await BillingPeriodService.openPeriod(
      teamId,
      new Date("2025-01-01T00:00:00.000Z"),
    );
    await BillingPeriodService.closePeriod(januaryPeriod);

    const februaryPeriod = await BillingPeriodService.openPeriod(
      teamId,
      new Date("2025-02-01T00:00:00.000Z"),
    );
    await BillingPeriodService.closePeriod(februaryPeriod);

    const summary = await TeamBillingService.getReportingSummary(teamId);

    expect(summary.closedPeriods).toHaveLength(2);
    expect(summary.closedPeriods[0].billedAmount).toBe(30);
    expect(summary.closedPeriods[1].billedAmount).toBe(15);
    expect(summary.closedPeriods[0].openingBalance).toBe(185);
    expect(summary.closedPeriods[0].creditsAdded).toBe(0);
    expect(summary.closedPeriods[1].openingBalance).toBe(0);
    expect(summary.closedPeriods[1].creditsAdded).toBe(200);
  });
});
