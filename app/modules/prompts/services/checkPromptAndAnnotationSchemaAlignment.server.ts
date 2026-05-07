import LLM from "~/modules/llm/llm";
import type { AnnotationSchemaItem } from "../prompts.types";

export default async function checkPromptAndAnnotationSchemaAlignment({
  userPrompt,
  annotationSchema,
  team,
  promptId,
  userId,
}: {
  userPrompt: string;
  annotationSchema: AnnotationSchemaItem[];
  team: string;
  promptId: string;
  userId: string;
}) {
  const annotationSchemaArray = [];

  let annotationSchemaCodes = ``;

  for (const annotationSchemaItem of annotationSchema) {
    if (!annotationSchemaItem.isSystem) {
      annotationSchemaArray.push({
        [annotationSchemaItem.fieldKey]: annotationSchemaItem.value,
      });

      if (annotationSchemaItem.codes && annotationSchemaItem.codes.length > 0) {
        annotationSchemaCodes += `${annotationSchemaItem.fieldKey}: ${annotationSchemaItem.codes.join(" | ")}\n`;
      }
    }
  }

  const schema = {
    type: "object",
    properties: {
      alignmentScore: { type: "number" },
      reasoning: { type: "string" },
    },
    required: ["alignmentScore", "reasoning"],
  };

  const llm = new LLM({
    model: "anthropic.claude-4.6-sonnet",
    team,
    userId,
    source: "prompt-alignment",
    sourceId: promptId,
    billingEventId: `prompt-alignment:check:${promptId}`,
    schema,
  });

  const codesRule = annotationSchemaCodes
    ? `\n- If an "Annotation schema codes" section is provided, check that the prompt instructs the LLM to use values from those lists for the corresponding fields.`
    : "";

  llm.addSystemMessage(
    `- The main focus for you is to make sure that was is written in the prompt has an annotation field associated with it. The annotation fields should match exactly as they are spelt in the prompt including casing.
    ${codesRule}
    - Score the prompt alignment based upon an alignmentScore from 0.1 to 1.0, with 1.0 being everything is aligned.
    - If the alignmentScore is less than 0.8, this is seen as the prompt and annotation schema DO NOT match.
    - If the alignmentScore is less than 0.8, give your reasoning in the reasoning value.
    - Always return you result as the following JSON: {{output}}.
    `,
    {
      output: JSON.stringify({
        alignmentScore: 0.1,
        reasoning: "",
      }),
    },
  );

  const userMessageParts = [
    `Prompt:\n{{prompt}}`,
    `Annotation schema:\n{{annotationSchema}}`,
  ];

  const userMessageVariables: Record<string, string> = {
    prompt: userPrompt,
    annotationSchema: JSON.stringify(annotationSchemaArray),
  };

  if (annotationSchemaCodes) {
    userMessageParts.push(
      `Annotation schema codes:\n{{annotationSchemaCodes}}`,
    );
    userMessageVariables.annotationSchemaCodes = annotationSchemaCodes;
  }

  llm.addUserMessage(userMessageParts.join("\n\n"), userMessageVariables);

  return llm.createChat();
}
