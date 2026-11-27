import type { Route } from "../api/api.types";
import { suggestPromptChanges } from "./prompts.services";
import type { SuggestPromptChangesInput } from "./prompts.types";

const controller: Route["controller"] = {
  create: async ({ params, body }, context) => {
    const { userPrompt, annotationSchema, alignmentScore, reasoning } =
      body as Omit<SuggestPromptChangesInput, "promptId">;
    return suggestPromptChanges(
      {
        promptId: params.promptId,
        userPrompt,
        annotationSchema,
        alignmentScore,
        reasoning,
      },
      context,
    );
  },
};

export default controller;
