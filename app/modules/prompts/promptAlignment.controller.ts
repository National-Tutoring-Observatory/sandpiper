import type { Route } from "../api/api.types";
import { checkPromptAlignment } from "./prompts.services";
import type { CheckPromptAlignmentInput } from "./prompts.types";

const controller: Route["controller"] = {
  create: async ({ params, body }, context) => {
    const { userPrompt, annotationSchema } = body as Omit<
      CheckPromptAlignmentInput,
      "promptId"
    >;
    return checkPromptAlignment(
      { promptId: params.promptId, userPrompt, annotationSchema },
      context,
    );
  },
};

export default controller;
