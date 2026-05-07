import LLM from "~/modules/llm/llm";
import type { AnnotationSchemaItem } from "../prompts.types";

export default async function checkPromptAndAnnotationSchemaAlignment({
  userPrompt,
  annotationSchema,
  team,
  promptId,
  alignmentScore,
  reasoning,
  userId,
}: {
  userPrompt: string;
  annotationSchema: AnnotationSchemaItem[];
  team: string;
  promptId: string;
  alignmentScore: number;
  reasoning: string;
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
      prompt: { type: "string" },
      annotationSchema: {
        type: "array",
        items: {
          type: "object",
          properties: {
            isSystem: { type: "boolean" },
            fieldType: {
              type: "string",
              enum: ["boolean", "string", "number"],
            },
            fieldKey: { type: "string" },
            value: { type: ["boolean", "string", "number"] },
            codes: { type: "array", items: { type: "string" } },
          },
          required: ["isSystem", "fieldType", "fieldKey", "value"],
        },
      },
    },
    required: ["prompt", "annotationSchema"],
  };

  const llm = new LLM({
    model: "anthropic.claude-4.6-sonnet",
    team,
    userId,
    source: "prompt-alignment",
    sourceId: promptId,
    billingEventId: `prompt-alignment:suggest:${promptId}`,
    schema,
  });

  llm.addSystemMessage(
    `- Rewrite the Prompt and Annotation Schema based upon the reasoning.
    - You need to make sure that was is written in the prompt has an annotation field associated with it. The annotation fields should match exactly as they are spelt in the prompt including casing.
    - Do not include the annotationSchema in the prompt text. Make sure this is returned in the annotationSchema array.
    - When rewriting the prompt, make sure it follows the original prompt and you are just trying to fix the issues. Keep the same formatting. The original spacing and new lines are really important.
    - Make sure the annotationSchema array has the correct annotation fields.
    - Always return you result as the following JSON: {{output}}.
    `,
    {
      output: JSON.stringify({
        prompt: "",
        annotationSchema: [
          {
            isSystem: false,
            fieldType: "string",
            fieldKey: "FIELD_NAME",
            value: "",
            codes: [],
          },
        ],
      }),
    },
  );

  const userMessageParts = [
    `Prompt:\n{{prompt}}`,
    `Annotation schema:\n{{annotationSchema}}`,
    `Reasoning:\n{{reasoning}}`,
    `Alignment score:\n{{alignmentScore}}`,
  ];

  const userMessageVariables: Record<string, string> = {
    prompt: userPrompt,
    annotationSchema: JSON.stringify(annotationSchemaArray),
    reasoning,
    alignmentScore: String(alignmentScore),
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
