import type { Route } from "../api/api.types";
import { publishPrompt } from "./prompts.services";
import type { PublishPromptInput } from "./prompts.types";

const controller: Route["controller"] = {
  create: async ({ params, body }, context) => {
    const { description, authors, paperRefs } = body as Omit<
      PublishPromptInput,
      "promptId"
    >;
    return publishPrompt(
      { promptId: params.promptId, description, authors, paperRefs },
      context,
    );
  },
};

export default controller;
