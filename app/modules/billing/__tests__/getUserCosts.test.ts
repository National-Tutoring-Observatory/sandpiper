import { Types } from "mongoose";
import { beforeEach, describe, expect, it } from "vitest";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import { BillingPlanService } from "../billingPlan";
import { paginateUserCosts } from "../services/getUserCosts.server";
import { TeamBillingService } from "../teamBilling";
import { TeamBillingBalanceService } from "../teamBillingBalance";
import { TeamBillingPlanService } from "../teamBillingPlan";

describe("getUserCosts", () => {
  const teamId = new Types.ObjectId().toString();
  const userA = new Types.ObjectId().toString();
  const userB = new Types.ObjectId().toString();

  beforeEach(async () => {
    await clearDocumentDB();

    const plan = await BillingPlanService.create({
      name: "Standard",
      markupRate: 1,
      isDefault: true,
    });
    await TeamBillingPlanService.assignPlanAt(teamId, plan._id, new Date(0));
    await TeamBillingBalanceService.ensureInitialized(teamId, 1000);
  });

  async function applyDebit(
    userId: string,
    source: string,
    rawAmount: number,
    key: string,
  ) {
    await TeamBillingService.applyDebit({
      teamId,
      userId,
      model: "claude-sonnet",
      source,
      inputTokens: 100,
      outputTokens: 50,
      rawAmount,
      providerCost: rawAmount * 0.8,
      idempotencyKey: key,
    });
  }

  it("splits run vs non-run costs per user", async () => {
    await applyDebit(userA, "annotation:per-session", 10, "a-ann");
    await applyDebit(userA, "verification:per-session", 5, "a-ver");
    await applyDebit(userA, "prompt-alignment", 2, "a-pa");
    await applyDebit(userB, "annotation:per-utterance", 8, "b-ann");
    await applyDebit(userB, "file-conversion", 1, "b-fc");

    const result = await paginateUserCosts(teamId, {
      match: {},
      sort: "-totalBilledCosts",
      page: 1,
    });

    expect(result.data).toHaveLength(2);
    expect(result.count).toBe(2);

    const rowA = result.data.find((r) => r.userId === userA)!;
    expect(rowA.runCosts).toBe(15);
    expect(rowA.nonRunCosts).toBe(2);
    expect(rowA.totalBilledCosts).toBe(17);

    const rowB = result.data.find((r) => r.userId === userB)!;
    expect(rowB.runCosts).toBe(8);
    expect(rowB.nonRunCosts).toBe(1);
    expect(rowB.totalBilledCosts).toBe(9);
  });

  it("returns empty when no debits exist", async () => {
    const result = await paginateUserCosts(teamId, {
      match: {},
      sort: "-totalBilledCosts",
      page: 1,
    });

    expect(result.data).toHaveLength(0);
    expect(result.count).toBe(0);
    expect(result.totalPages).toBe(0);
  });

  it("stores userId on billing ledger debit entries", async () => {
    await applyDebit(userA, "annotation:per-session", 10, "check-user-field");

    const { BillingLedgerEntryService } = await import("../billingLedgerEntry");
    const entries = await BillingLedgerEntryService.findByTeam(teamId);
    const debit = entries.find((e) => e.direction === "debit");

    expect(debit).toBeDefined();
    expect(debit!.user).toBe(userA);
  });
});
