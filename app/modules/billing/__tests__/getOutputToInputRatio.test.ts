import { Types } from "mongoose";
import { beforeEach, describe, expect, it } from "vitest";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import { TeamBillingService } from "../teamBilling";

describe("getOutputToInputRatio", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  const teamId = new Types.ObjectId().toString();
  const userId = new Types.ObjectId().toString();

  it("returns null when no annotation ledger entries exist", async () => {
    const result = await TeamBillingService.getOutputToInputRatio(teamId);
    expect(result).toBeNull();
  });

  it("returns null when only non-annotation debit entries exist", async () => {
    await TeamBillingService.applyDebit({
      teamId,
      userId,
      model: "claude-opus",
      source: "billing:check",
      sourceId: "billing-check-1",
      inputTokens: 1000,
      outputTokens: 200,
      rawAmount: 10,
      providerCost: 8,
      idempotencyKey: "llm-cost:billing-check-1",
    });

    const result = await TeamBillingService.getOutputToInputRatio(teamId);
    expect(result).toBeNull();
  });

  it("returns null when annotation entries belong to another team", async () => {
    const otherTeamId = new Types.ObjectId().toString();

    await TeamBillingService.applyDebit({
      teamId: otherTeamId,
      userId,
      model: "claude-opus",
      source: "annotation:per-session",
      sourceId: "session-other-team",
      inputTokens: 1000,
      outputTokens: 200,
      rawAmount: 10,
      providerCost: 8,
      idempotencyKey: "llm-cost:session-other-team",
    });

    const result = await TeamBillingService.getOutputToInputRatio(teamId);
    expect(result).toBeNull();
  });

  it("computes weighted output/input ratio from annotation ledger entries", async () => {
    await TeamBillingService.applyDebit({
      teamId,
      userId,
      model: "claude-opus",
      source: "annotation:per-session",
      sourceId: "session-1",
      inputTokens: 1000,
      outputTokens: 200,
      rawAmount: 10,
      providerCost: 8,
      idempotencyKey: "llm-cost:session-1",
    });

    await TeamBillingService.applyDebit({
      teamId,
      userId,
      model: "claude-opus",
      source: "annotation:per-utterance",
      sourceId: "session-2",
      inputTokens: 500,
      outputTokens: 300,
      rawAmount: 10,
      providerCost: 8,
      idempotencyKey: "llm-cost:session-2",
    });

    const result = await TeamBillingService.getOutputToInputRatio(teamId);
    expect(result).toBeCloseTo(500 / 1500, 5);
  });

  it("excludes non-annotation entries from the ratio", async () => {
    await TeamBillingService.applyDebit({
      teamId,
      userId,
      model: "claude-opus",
      source: "annotation:per-session",
      sourceId: "session-annotation",
      inputTokens: 1000,
      outputTokens: 200,
      rawAmount: 10,
      providerCost: 8,
      idempotencyKey: "llm-cost:session-annotation",
    });

    await TeamBillingService.applyDebit({
      teamId,
      userId,
      model: "claude-opus",
      source: "billing:check",
      sourceId: "billing-check-2",
      inputTokens: 9999,
      outputTokens: 9999,
      rawAmount: 10,
      providerCost: 8,
      idempotencyKey: "llm-cost:billing-check-2",
    });

    const result = await TeamBillingService.getOutputToInputRatio(teamId);
    expect(result).toBeCloseTo(200 / 1000, 5);
  });
});
