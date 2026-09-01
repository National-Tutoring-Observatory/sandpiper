import { PromptVersionService } from "~/modules/prompts/promptVersion";
import { calculateEstimate } from "~/modules/runSets/helpers/calculateEstimate";
import type {
  EstimationResult,
  RunDefinition,
} from "~/modules/runSets/runSets.types";
import { RunService } from "~/modules/runs/run";
import { SessionService } from "~/modules/sessions/session";
import isLedgerBillingEnabled from "../helpers/isLedgerBillingEnabled";
import { TeamBillingService } from "../teamBilling";
import { TeamBillingPlanService } from "../teamBillingPlan";

async function fetchPromptTokens(
  definitions: RunDefinition[],
): Promise<Map<string, number | undefined>> {
  const unique = new Map<string, { promptId: string; version: number }>();
  for (const def of definitions) {
    const key = `${def.prompt.promptId}:${def.prompt.version}`;
    if (!unique.has(key)) {
      unique.set(key, {
        promptId: def.prompt.promptId,
        version: def.prompt.version,
      });
    }
  }

  const entries = Array.from(unique.entries());
  const docs = await Promise.all(
    entries.map(([, pv]) =>
      PromptVersionService.findOne({
        prompt: pv.promptId,
        version: pv.version,
      }),
    ),
  );

  const result = new Map<string, number | undefined>();
  entries.forEach(([key], i) => {
    result.set(key, docs[i]?.inputTokens);
  });
  return result;
}

export default async function estimateCost({
  teamId,
  projectId,
  sessionIds,
  definitions,
  shouldRunVerification,
}: {
  teamId: string;
  projectId: string;
  sessionIds: string[];
  definitions: RunDefinition[];
  shouldRunVerification: boolean;
}): Promise<EstimationResult> {
  const [
    sessions,
    outputToInputRatio,
    promptTokens,
    plan,
    avgSecondsPerSession,
  ] = await Promise.all([
    SessionService.find({
      match: { _id: { $in: sessionIds }, project: projectId },
      select: "_id inputTokens",
    }),
    TeamBillingService.getOutputToInputRatio(teamId),
    fetchPromptTokens(definitions),
    TeamBillingPlanService.getEffectivePlan(teamId),
    RunService.getAverageSecondsPerSession(projectId),
  ]);

  // Where the team ledger isn't the billing authority, a team with no plan must
  // not be blocked from running — the estimate just carries no markup.
  // Everywhere else a missing plan is a real misconfiguration.
  if (!plan && isLedgerBillingEnabled()) {
    throw new Error(`No billing plan found for team ${teamId}`);
  }

  const runDefinitions = definitions.map((def) => ({
    modelCode: def.modelCode,
    prompt: {
      inputTokens: promptTokens.get(
        `${def.prompt.promptId}:${def.prompt.version}`,
      ),
    },
  }));

  const { estimatedCost, estimatedTimeSeconds } = calculateEstimate(
    runDefinitions,
    sessions,
    {
      shouldRunVerification,
      outputToInputRatio,
      avgSecondsPerSession,
    },
  );

  return {
    estimatedCost: estimatedCost * (plan?.markupRate ?? 1),
    estimatedTimeSeconds,
  };
}
