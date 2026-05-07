import { RunService } from "~/modules/runs/run";
import type { RunAnnotationType } from "~/modules/runs/runs.types";
import { generateRunName } from "../helpers/generateRunName";
import { RunSetService } from "../runSet";
import type { RunDefinition, RunSet } from "../runSets.types";

export interface CreateRunSetWithRunsPayload {
  project: string;
  name: string;
  sessions: string[];
  definitions: RunDefinition[];
  annotationType: RunAnnotationType;
  shouldRunVerification?: boolean;
  userId: string;
}

export default async function createRunSetWithRuns(
  payload: CreateRunSetWithRunsPayload,
): Promise<{ runSet: RunSet; errors: string[] }> {
  const runSet = await RunSetService.create({
    project: payload.project,
    name: payload.name,
    sessions: payload.sessions,
    runs: [],
    annotationType: payload.annotationType,
  });

  const generatedRunIds: string[] = [];
  const runErrors: string[] = [];

  for (const definition of payload.definitions) {
    const runName = generateRunName(
      runSet.name,
      definition.prompt,
      definition.modelCode,
    );

    try {
      const newRun = await RunService.create({
        project: payload.project,
        name: runName,
        sessions: payload.sessions,
        annotationType: payload.annotationType,
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
        `Error starting run for prompt ${definition.prompt.promptId} and model ${definition.modelCode}: ${error}`,
      );
    }
  }

  const updatedRunSet = await RunSetService.updateById(runSet._id, {
    runs: generatedRunIds,
  });

  return {
    runSet: updatedRunSet || runSet,
    errors: runErrors,
  };
}
