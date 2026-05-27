import Decimal from "decimal.js";
import type { Db, ObjectId } from "mongodb";
import type {
  MigrationFile,
  MigrationResult,
} from "~/modules/migrations/types";

async function getTeamAdminUser(
  db: Db,
  teamId: ObjectId,
  createdBy: ObjectId | undefined,
): Promise<ObjectId | undefined> {
  if (createdBy) return createdBy;

  const user = await db
    .collection("users")
    .find({ teams: { $elemMatch: { team: teamId, role: "ADMIN" } } })
    .sort({ _id: 1 })
    .limit(1)
    .next();

  return user?._id;
}

async function getMarkupRate(db: Db, teamId: ObjectId): Promise<number | null> {
  const assignment = await db
    .collection("teambillingplans")
    .find({ team: teamId, effectiveFrom: { $lte: new Date() } })
    .sort({ effectiveFrom: -1 })
    .limit(1)
    .next();

  if (!assignment?.plan) return null;

  const plan = await db
    .collection("billingplans")
    .findOne({ _id: assignment.plan });

  return typeof plan?.markupRate === "number" ? plan.markupRate : null;
}

async function getLedgerTotals(
  db: Db,
  teamId: ObjectId,
): Promise<{ credits: number; rawCosts: number; billedCosts: number }> {
  const result = await db
    .collection("billingledgerentries")
    .aggregate([
      { $match: { team: teamId } },
      {
        $group: {
          _id: null,
          credits: {
            $sum: {
              $cond: [{ $eq: ["$direction", "credit"] }, "$amount", 0],
            },
          },
          rawCosts: {
            $sum: {
              $cond: [{ $eq: ["$direction", "debit"] }, "$rawAmount", 0],
            },
          },
          billedCosts: {
            $sum: {
              $cond: [{ $eq: ["$direction", "debit"] }, "$amount", 0],
            },
          },
        },
      },
    ])
    .toArray();

  return {
    credits: result[0]?.credits ?? 0,
    rawCosts: result[0]?.rawCosts ?? 0,
    billedCosts: result[0]?.billedCosts ?? 0,
  };
}

async function recalculateBillingPeriods(
  db: Db,
  teamId: ObjectId,
): Promise<void> {
  // Only recalculate closed periods. The current open period (if any) will
  // self-correct when BillingPeriodService.closePeriod() runs at month-end,
  // as it re-aggregates from the ledger at that point.
  const periods = await db
    .collection("billingperiods")
    .find({ team: teamId, status: "closed" })
    .sort({ startAt: 1 })
    .toArray();

  if (periods.length === 0) return;

  const firstPeriodStart = new Date(periods[0].startAt);
  const prePeriodResult = await db
    .collection("billingledgerentries")
    .aggregate([
      { $match: { team: teamId, createdAt: { $lt: firstPeriodStart } } },
      {
        $group: {
          _id: null,
          credits: {
            $sum: {
              $cond: [{ $eq: ["$direction", "credit"] }, "$amount", 0],
            },
          },
          debits: {
            $sum: {
              $cond: [{ $eq: ["$direction", "debit"] }, "$amount", 0],
            },
          },
        },
      },
    ])
    .toArray();

  let runningBalance = new Decimal(prePeriodResult[0]?.credits ?? 0)
    .minus(prePeriodResult[0]?.debits ?? 0)
    .toNumber();

  const periodTotals = await Promise.all(
    periods.map((period) =>
      db
        .collection("billingledgerentries")
        .aggregate([
          {
            $match: {
              team: teamId,
              createdAt: {
                $gte: new Date(period.startAt),
                $lt: new Date(period.endAt),
              },
            },
          },
          {
            $group: {
              _id: null,
              creditsAdded: {
                $sum: {
                  $cond: [{ $eq: ["$direction", "credit"] }, "$amount", 0],
                },
              },
              rawCost: {
                $sum: {
                  $cond: [{ $eq: ["$direction", "debit"] }, "$rawAmount", 0],
                },
              },
              billedAmount: {
                $sum: {
                  $cond: [{ $eq: ["$direction", "debit"] }, "$amount", 0],
                },
              },
            },
          },
        ])
        .toArray(),
    ),
  );

  const bulkOps = [];
  for (let i = 0; i < periods.length; i++) {
    const totals = periodTotals[i][0];
    const creditsAdded = totals?.creditsAdded ?? 0;
    const rawCost = totals?.rawCost ?? 0;
    const billedAmount = totals?.billedAmount ?? 0;
    const openingBalance = runningBalance;
    const closingBalance = new Decimal(openingBalance)
      .plus(creditsAdded)
      .minus(billedAmount)
      .toNumber();

    bulkOps.push({
      updateOne: {
        filter: { _id: periods[i]._id },
        update: {
          $set: {
            openingBalance,
            creditsAdded,
            rawCost,
            billedAmount,
            closingBalance,
          },
        },
      },
    });

    runningBalance = closingBalance;
  }

  await db.collection("billingperiods").bulkWrite(bulkOps);
}

export default {
  id: "20260518120000-expand-legacy-billing-into-ledger",
  name: "Expand Legacy Billing Into Ledger",
  description:
    "Replaces the per-team legacy carry-forward ledger entry with individual debit/credit entries from llmcosts and teamcredits, preserving original timestamps. Recalculates billing period summaries and TeamBillingBalance running totals.",

  async up(db: Db): Promise<MigrationResult> {
    console.log("Starting Expand Legacy Billing Into Ledger migration...");

    const teams = await db
      .collection("teams")
      .find({}, { projection: { _id: 1, createdBy: 1 } })
      .toArray();

    console.log(`Found ${teams.length} team(s)`);

    let insertedDebits = 0;
    let insertedCredits = 0;
    let deletedCarryForwards = 0;
    let updatedBalances = 0;
    let failed = 0;

    for (const team of teams) {
      const teamId = team._id as ObjectId;

      try {
        const markupRate = await getMarkupRate(db, teamId);
        if (markupRate === null) {
          console.log(`  Skipping team ${teamId} — no billing plan found`);
          continue;
        }

        const [llmCosts, teamCredits, existingEntries, teamUserId] =
          await Promise.all([
            db
              .collection("llmcosts")
              .find({ team: teamId, isLegacy: true })
              .toArray(),
            db
              .collection("teamcredits")
              .find({ team: teamId, isLegacy: true })
              .toArray(),
            db
              .collection("billingledgerentries")
              .find(
                { team: teamId, isLegacy: true },
                { projection: { idempotencyKey: 1, _id: 0 } },
              )
              .toArray(),
            getTeamAdminUser(db, teamId, team.createdBy),
          ]);

        const existingKeySet = new Set(
          existingEntries.map((e) => e.idempotencyKey as string),
        );

        console.log(
          `  Team ${teamId}: ${llmCosts.length} cost(s), ${teamCredits.length} credit(s), markupRate=${markupRate}`,
        );

        const newDebits = llmCosts
          .filter(
            (cost) =>
              !existingKeySet.has(`legacy-llmcost:${cost._id.toString()}`),
          )
          .map((cost) => {
            const rawAmount: number = cost.cost ?? 0;
            const billedAmount = new Decimal(rawAmount)
              .times(markupRate)
              .toNumber();
            return {
              team: teamId,
              ...(teamUserId != null ? { user: teamUserId } : {}),
              direction: "debit",
              amount: billedAmount,
              currency: "USD",
              rawAmount,
              markupRateApplied: markupRate,
              billedAmount,
              ...(cost.model != null ? { model: cost.model } : {}),
              ...(cost.inputTokens != null
                ? { inputTokens: cost.inputTokens }
                : {}),
              ...(cost.outputTokens != null
                ? { outputTokens: cost.outputTokens }
                : {}),
              ...(cost.providerCost != null
                ? { providerCost: cost.providerCost }
                : {}),
              source: cost.source ?? "legacy-llmcost",
              sourceId: cost.sourceId ?? cost._id.toString(),
              idempotencyKey: `legacy-llmcost:${cost._id.toString()}`,
              isLegacy: true,
              legacyNotes: "expanded from llmcosts collection",
              metadata: { llmCostId: cost._id.toString() },
              createdAt: cost.createdAt ?? new Date(),
            };
          });

        const newCredits = teamCredits
          .filter(
            (credit) =>
              !existingKeySet.has(`legacy-credit:${credit._id.toString()}`),
          )
          .map((credit) => ({
            team: teamId,
            direction: "credit",
            amount: credit.amount ?? 0,
            currency: "USD",
            source: "legacy-credit",
            sourceId: credit._id.toString(),
            idempotencyKey: `legacy-credit:${credit._id.toString()}`,
            isLegacy: true,
            legacyNotes: "expanded from teamcredits collection",
            metadata: {
              ...(credit.addedBy != null ? { addedBy: credit.addedBy } : {}),
              ...(credit.note != null ? { note: credit.note } : {}),
            },
            createdAt: credit.createdAt ?? new Date(),
          }));

        if (newDebits.length > 0) {
          await db
            .collection("billingledgerentries")
            .insertMany(newDebits, { ordered: false });
          insertedDebits += newDebits.length;
        }

        if (newCredits.length > 0) {
          await db
            .collection("billingledgerentries")
            .insertMany(newCredits, { ordered: false });
          insertedCredits += newCredits.length;
        }

        const deleteResult = await db
          .collection("billingledgerentries")
          .deleteOne({
            idempotencyKey: `legacy-balance:${teamId.toString()}`,
          });
        deletedCarryForwards += deleteResult.deletedCount;

        const [totals] = await Promise.all([
          getLedgerTotals(db, teamId),
          recalculateBillingPeriods(db, teamId),
        ]);

        await db.collection("teambillingbalances").updateOne(
          { team: teamId },
          {
            $set: {
              availableBalance: totals.credits - totals.billedCosts,
              totalCredits: totals.credits,
              totalRawCosts: totals.rawCosts,
              totalBilledCosts: totals.billedCosts,
            },
          },
          { upsert: true },
        );
        updatedBalances++;

        console.log(
          `  ✓ Team ${teamId}: ${llmCosts.length} debit(s), ${teamCredits.length} credit(s), carry-forward removed`,
        );
      } catch (error) {
        console.error(`  ✗ Failed for team ${teamId}:`, error);
        failed++;
      }
    }

    console.log(
      `Done: ${insertedDebits} debit(s), ${insertedCredits} credit(s), ${deletedCarryForwards} carry-forward(s) removed, ${updatedBalances} balance(s) refreshed`,
    );

    return {
      success: failed === 0,
      message: `Inserted ${insertedDebits} debit(s) and ${insertedCredits} credit(s), removed ${deletedCarryForwards} carry-forward(s)`,
      stats: {
        migrated: insertedDebits + insertedCredits,
        failed,
        insertedDebits,
        insertedCredits,
        deletedCarryForwards,
        updatedBalances,
      },
    };
  },
} satisfies MigrationFile;
