import type { AnnotationTypeOptions } from "~/modules/annotations/helpers/annotationTypes";
import { findModelByCode } from "~/modules/llm/modelRegistry";
import getSystemPrompt from "~/modules/prompts/helpers/getSystemPrompt";
import { PromptService } from "~/modules/prompts/prompt";
import type { AnnotationSchemaItem } from "~/modules/prompts/prompts.types";
import { PromptVersionService } from "~/modules/prompts/promptVersion";

/**
 * Snapshot sections that can be added to a run.
 * Stores complete frozen state of resources used in the run at creation time.
 */
export interface RunSnapshot {
  prompt: {
    name: string;
    userPrompt: string;
    annotationSchema: AnnotationSchemaItem[];
    annotationType: string;
    version: number;
    systemPrompt: string;
    verifySystemPrompt: string;
    adjudicateSystemPrompt: string;
  };
  model: {
    code: string;
    provider: string;
    name: string;
  };
}

interface BuildPromptSnapshotProps {
  promptId: string;
  promptVersionNumber: number;
  annotationType: AnnotationTypeOptions;
  shouldRunVerification: boolean;
  isAdjudication: boolean;
}

interface BuildModelSnapshotProps {
  modelCode: string;
}

async function buildPromptSnapshot({
  promptId,
  promptVersionNumber,
  annotationType,
  shouldRunVerification,
  isAdjudication,
}: BuildPromptSnapshotProps) {
  const prompt = await PromptService.findById(promptId);
  const promptVersion = await PromptVersionService.findOne({
    prompt: promptId,
    version: promptVersionNumber,
  });

  if (!promptVersion) {
    throw new Error(
      `Prompt version not found: ${promptId} v${promptVersionNumber}`,
    );
  }

  if (!prompt) {
    throw new Error(`Prompt not found: ${promptId}`);
  }

  return {
    name: prompt.name,
    userPrompt: promptVersion.userPrompt,
    annotationSchema: promptVersion.annotationSchema,
    annotationType: prompt.annotationType,
    version: promptVersion.version,
    systemPrompt: getSystemPrompt("annotation", annotationType),
    verifySystemPrompt: shouldRunVerification
      ? getSystemPrompt("verify", annotationType)
      : "",
    adjudicateSystemPrompt: isAdjudication
      ? getSystemPrompt("adjudicate", annotationType)
      : "",
  };
}

async function buildModelSnapshot({ modelCode }: BuildModelSnapshotProps) {
  const modelInfo = findModelByCode(modelCode);
  if (!modelInfo) {
    throw new Error(`Model not found: ${modelCode}`);
  }
  return {
    code: modelCode,
    provider: modelInfo.provider,
    name: modelInfo.name,
  };
}

export async function buildRunSnapshot({
  promptId,
  promptVersionNumber,
  modelCode,
  annotationType,
  shouldRunVerification,
  isAdjudication,
}: {
  promptId: string;
  promptVersionNumber: number;
  modelCode: string;
  annotationType: AnnotationTypeOptions;
  shouldRunVerification: boolean;
  isAdjudication: boolean;
}): Promise<RunSnapshot> {
  const snapshot: RunSnapshot = {
    prompt: await buildPromptSnapshot({
      promptId,
      promptVersionNumber,
      annotationType,
      shouldRunVerification,
      isAdjudication,
    }),
    model: await buildModelSnapshot({ modelCode }),
  };

  return snapshot;
}

export default buildRunSnapshot;
