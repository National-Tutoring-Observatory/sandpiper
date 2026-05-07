import { Types } from "mongoose";
import { beforeEach, describe, expect, it } from "vitest";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import { BillingPlanService } from "../billingPlan";
import { InsufficientCreditsError } from "../errors/insufficientCreditsError";
import { TeamBillingService } from "../teamBilling";
import { TeamBillingPlanService } from "../teamBillingPlan";

describe("InsufficientCreditsError", () => {
  it("has the correct name and message", () => {
    const error = new InsufficientCreditsError("team-123");
    expect(error.name).toBe("InsufficientCreditsError");
    expect(error.message).toContain("usage limit");
    expect(error.teamId).toBe("team-123");
    expect(error).toBeInstanceOf(Error);
  });
});

describe("Balance check logic", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  const teamId = new Types.ObjectId().toString();
  const userId = new Types.ObjectId().toString();

  async function setupTeamWithPlan(creditAmount: number, costAmount: number) {
    const plan = await BillingPlanService.create({
      name: "Standard",
      markupRate: 1.5,
      isDefault: true,
    });
    await TeamBillingPlanService.assignPlanAt(teamId, plan._id, new Date(0));

    if (creditAmount > 0) {
      await TeamBillingService.applyCredit({
        teamId,
        amount: creditAmount,
        addedBy: userId,
        source: "admin-credit",
        sourceId: `admin-credit:${creditAmount}`,
        idempotencyKey: `admin-credit:test:${teamId}:${creditAmount}`,
      });
    }

    if (costAmount > 0) {
      await TeamBillingService.applyDebit({
        teamId,
        userId,
        model: "claude-opus",
        source: "annotation:per-session",
        sourceId: `session:${costAmount}`,
        inputTokens: 500,
        outputTokens: 100,
        rawAmount: costAmount,
        providerCost: costAmount * 0.8,
        idempotencyKey: `llm-cost:test:${teamId}:${costAmount}`,
      });
    }
  }

  it("returns positive balance when credits exceed marked-up costs", async () => {
    await setupTeamWithPlan(100, 10);
    const balance = await TeamBillingService.getBalance(teamId);
    expect(balance).toBe(85);
  });

  it("returns zero when no plan is assigned", async () => {
    const balance = await TeamBillingService.getBalance(teamId);
    expect(balance).toBe(0);
  });

  it("returns negative balance when costs exceed credits", async () => {
    await setupTeamWithPlan(10, 20);
    const balance = await TeamBillingService.getBalance(teamId);
    expect(balance).toBe(-20);
  });

  it("returns zero balance when credits exactly cover costs", async () => {
    await setupTeamWithPlan(15, 10);
    const balance = await TeamBillingService.getBalance(teamId);
    expect(balance).toBe(0);
  });

  it("returns full credit amount when no costs exist", async () => {
    await setupTeamWithPlan(100, 0);
    const balance = await TeamBillingService.getBalance(teamId);
    expect(balance).toBe(100);
  });

  it("indicates insufficient credits when costs exceed credits", async () => {
    await setupTeamWithPlan(0, 20);
    const balance = await TeamBillingService.getBalance(teamId);
    expect(balance).toBeLessThanOrEqual(0);
  });

  it("indicates sufficient credits when team has positive balance", async () => {
    await setupTeamWithPlan(100, 0);
    const balance = await TeamBillingService.getBalance(teamId);
    expect(balance).toBeGreaterThan(0);
  });
});
