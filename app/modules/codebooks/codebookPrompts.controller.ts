import type { Route } from "../api/api.types";
import { createPromptFromCodebook } from "./codebooks.services";
import type { CreatePromptFromCodebookInput } from "./codebooks.types";

const controller: Route["controller"] = {
  create: async ({ params, body }, context) => {
    const { codebookId } = params;
    return createPromptFromCodebook(
      {
        ...(body as Omit<CreatePromptFromCodebookInput, "codebookId">),
        codebookId,
      },
      context,
    );
  },
};

export default controller;
