import { findModelByCode } from "~/modules/llm/modelRegistry";
import { RunService } from "~/modules/runs/run";
import type { RunAnnotationType } from "~/modules/runs/runs.types";
import { RunSetService } from "~/modules/runSets/runSet";
import { EvaluationService } from "../evaluation";

interface CreateAdjudicationRunParams {
  evaluationId: string;
  selectedRunIds: string[];
  modelCode: string;
  projectId: string;
  runSetId: string;
  promptId: string;
  promptVersion: number;
  userId: string;
}

export default async function createAdjudicationRun(
  params: CreateAdjudicationRunParams,
) {
  const {
    evaluationId,
    selectedRunIds,
    modelCode,
    projectId,
    runSetId,
    promptId,
    promptVersion,
  } = params;

  const runSet = await RunSetService.findById(runSetId);
  if (!runSet) {
    return;
  }

  const annotationType = runSet.annotationType || "PER_UTTERANCE";

  const modelInfo = findModelByCode(modelCode);
  const runName = `Adjudication - ${modelInfo?.name || modelCode}`;

  const run = await RunService.create({
    project: projectId,
    name: runName,
    sessions: runSet.sessions || [],
    annotationType: annotationType as RunAnnotationType,
    prompt: promptId,
    promptVersion,
    modelCode,
    shouldRunVerification: false,
    createdBy: params.userId,
    isAdjudication: true,
    adjudication: {
      sourceRuns: selectedRunIds,
    },
  });

  await RunSetService.updateById(runSetId, {
    runs: [...(runSet.runs || []), run._id],
  });

  const evaluation = await EvaluationService.findById(evaluationId);
  if (evaluation) {
    await EvaluationService.updateById(evaluationId, {
      runs: [...evaluation.runs, run._id],
    });
  }

  RunService.start(run, evaluationId, params.userId);
}
