import { RunService } from "~/modules/runs/run";
import type { RunAnnotationType } from "~/modules/runs/runs.types";
import { generateRunName } from "../helpers/generateRunName";
import getUsedPromptModels, {
  buildUsedPromptModelKey,
  buildUsedPromptModelSet,
} from "../helpers/getUsedPromptModels";
import { RunSetService } from "../runSet";
import type { RunDefinition, RunSet } from "../runSets.types";

export interface CreateRunsForRunSetPayload {
  runSetId: string;
  definitions: RunDefinition[];
  shouldRunVerification?: boolean;
  userId: string;
}

export interface CreateRunsForRunSetResult {
  runSet: RunSet | null;
  errors: string[];
  createdRunIds: string[];
}

export default async function createRunsForRunSet(
  payload: CreateRunsForRunSetPayload,
): Promise<CreateRunsForRunSetResult> {
  const runSet = await RunSetService.findById(payload.runSetId);
  if (!runSet) {
    return {
      runSet: null,
      errors: ["Run set not found"],
      createdRunIds: [],
    };
  }

  const existingRuns = runSet.runs?.length
    ? await RunService.find({ match: { _id: { $in: runSet.runs } } })
    : [];

  const usedPairs = getUsedPromptModels(existingRuns);
  const usedKeys = buildUsedPromptModelSet(usedPairs);

  const generatedRunIds: string[] = [];
  const runErrors: string[] = [];

  for (const definition of payload.definitions) {
    const key = buildUsedPromptModelKey(
      definition.prompt.promptId,
      definition.prompt.version,
      definition.modelCode,
    );
    if (usedKeys.has(key)) {
      continue;
    }

    const runName = generateRunName(
      runSet.name,
      definition.prompt,
      definition.modelCode,
    );

    try {
      const newRun = await RunService.create({
        project: runSet.project,
        name: runName,
        sessions: runSet.sessions || [],
        annotationType: runSet.annotationType as RunAnnotationType,
        prompt: definition.prompt.promptId,
        promptVersion: definition.prompt.version,
        modelCode: definition.modelCode,
        shouldRunVerification: !!payload.shouldRunVerification,
        createdBy: payload.userId,
      });

      generatedRunIds.push(newRun._id);

      await RunService.start(newRun, undefined, payload.userId);
    } catch (error) {
      runErrors.push(
        `Error creating run for prompt ${definition.prompt.promptId} and model ${definition.modelCode}: ${error}`,
      );
    }
  }

  const updatedRunSet = await RunSetService.updateById(runSet._id, {
    runs: [...(runSet.runs || []), ...generatedRunIds],
  });

  return {
    runSet: updatedRunSet || runSet,
    errors: runErrors,
    createdRunIds: generatedRunIds,
  };
}
