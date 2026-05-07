import Decimal from "decimal.js";
import withTransaction from "~/lib/withTransaction";
import { BillingLedgerEntryModel } from "../billingLedgerEntry";
import {
  debitsAppliedCounter,
  idempotentSkipsCounter,
} from "../helpers/billingMetrics";
import { TeamBillingBalanceService } from "../teamBillingBalance";
import { TeamBillingPlanService } from "../teamBillingPlan";

interface ApplyBillingDebitInput {
  teamId: string;
  userId?: string;
  model: string;
  source: string;
  sourceId?: string;
  createdAt?: Date;
  inputTokens: number;
  outputTokens: number;
  rawAmount: number;
  providerCost: number;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}

export default async function applyBillingDebit({
  teamId,
  userId,
  model,
  source,
  sourceId,
  createdAt,
  inputTokens,
  outputTokens,
  rawAmount,
  providerCost,
  idempotencyKey,
  metadata,
}: ApplyBillingDebitInput): Promise<void> {
  if (rawAmount <= 0) throw new Error("Debit rawAmount must be positive");
  const entryCreatedAt = createdAt ?? new Date();

  const plan = await TeamBillingPlanService.getEffectivePlan(teamId);
  const markupRateApplied = plan?.markupRate ?? 1;
  const billedAmount = new Decimal(rawAmount)
    .times(markupRateApplied)
    .toNumber();

  try {
    await withTransaction(async (session) => {
      await BillingLedgerEntryModel.create(
        [
          {
            team: teamId,
            ...(userId && { user: userId }),
            direction: "debit",
            amount: billedAmount,
            currency: "USD",
            rawAmount,
            markupRateApplied,
            billedAmount,
            model,
            inputTokens,
            outputTokens,
            providerCost,
            source,
            sourceId,
            idempotencyKey,
            metadata,
            createdAt: entryCreatedAt,
          },
        ],
        { session },
      );

      await TeamBillingBalanceService.applyDelta(
        teamId,
        -billedAmount,
        session,
        {
          totalRawCosts: rawAmount,
          totalBilledCosts: billedAmount,
        },
      );
    });

    debitsAppliedCounter.add(billedAmount, { team: teamId, model });
  } catch (error) {
    // Duplicate key means this idempotency key was already applied, so treat the
    // retry as a no-op instead of failing the request.
    if ((error as { code?: number }).code === 11000) {
      idempotentSkipsCounter.add(1, { direction: "debit", team: teamId });
      return;
    }

    throw error;
  }
}
