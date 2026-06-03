import type { AnnotationTypeOptions } from "~/modules/annotations/helpers/annotationTypes";
import handleLLMError from "~/modules/llm/helpers/handleLLMError";
import LLM from "~/modules/llm/llm";
import { PromptService } from "~/modules/prompts/prompt";
import { PromptVersionService } from "~/modules/prompts/promptVersion";
import { CodebookService } from "../codebook";
import { CodebookVersionService } from "../codebookVersion";
import {
  buildAnnotationSchemaFromCategories,
  buildCodebookSummary,
} from "../helpers/buildCodebookSummary";

export default async function createPromptFromCodebook({
  codebookId,
  codebookVersionId,
  annotationType,
  categoryIds,
  hasFlattenedCategories,
  flattenedAnnotationField,
  userId,
  teamId,
}: {
  codebookId: string;
  codebookVersionId: string;
  annotationType: AnnotationTypeOptions;
  categoryIds?: string[];
  hasFlattenedCategories?: boolean;
  flattenedAnnotationField?: string;
  userId: string;
  teamId: string;
}) {
  const codebook = await CodebookService.findById(codebookId);
  if (!codebook) {
    throw new Error("Codebook not found");
  }

  const codebookVersion = await CodebookVersionService.findOne({
    _id: codebookVersionId,
    codebook: codebookId,
  });
  if (!codebookVersion) {
    throw new Error("Codebook version not found");
  }

  const categories =
    categoryIds && categoryIds.length > 0
      ? codebookVersion.categories.filter((c) => categoryIds.includes(c._id))
      : codebookVersion.categories;

  const summary = buildCodebookSummary({
    codebookName: codebook.name,
    codebookDescription: codebook.description,
    categories,
  });

  const annotationSchema = buildAnnotationSchemaFromCategories(
    categories,
    hasFlattenedCategories
      ? { flattenedFieldKey: flattenedAnnotationField }
      : undefined,
  );

  let userPrompt: string;

  try {
    const schema = {
      type: "object",
      properties: {
        prompt: { type: "string" },
      },
      required: ["prompt"],
    };

    const llm = new LLM({
      model: "anthropic.claude-4.6-opus",
      team: teamId,
      userId,
      source: "codebook-prompt-generation",
      sourceId: codebookId,
      billingEventId: `codebook-prompt-generation:${codebookVersionId}`,
      schema,
    });

    const flatteningInstruction = hasFlattenedCategories
      ? `\n    - IMPORTANT: All categories have been flattened into a single annotation field called "${flattenedAnnotationField}". The prompt should instruct the LLM to use this single field for its annotation, choosing from the combined codes of all categories. Do not reference individual category field names.`
      : "";

    llm.addSystemMessage(
      `You are an expert at writing LLM annotation prompts for analysing tutoring transcripts.
    - You will be given a codebook summary containing categories, codes, definitions, and examples.
    - Your task is to write a clear, detailed prompt that an LLM can use to annotate transcripts according to the codebook.
    - The prompt should instruct the LLM to classify each annotation field using the codes defined in the codebook.
    - Include the code definitions and examples from the codebook so the LLM understands each code.
    - Do not include any JSON schema or output format instructions — those are handled separately.${flatteningInstruction}`,
      {},
    );

    llm.addUserMessage(`Codebook summary:\n{{summary}}`, {
      summary,
    });

    const response = await llm.createChat();
    userPrompt = response.prompt;
  } catch (error) {
    const errorMessage = handleLLMError(error);
    throw new Error(errorMessage, { cause: error });
  }

  const prompt = await PromptService.create({
    name: codebook.name,
    annotationType,
    team: teamId,
    productionVersion: 1,
    createdBy: userId,
  });

  await PromptVersionService.create({
    name: "initial",
    prompt: prompt._id,
    version: 1,
    userPrompt,
    annotationSchema,
    codebook: codebookId,
    codebookVersion: codebookVersionId,
  });

  return prompt;
}
