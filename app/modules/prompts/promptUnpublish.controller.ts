import type { Route } from "../api/api.types";
import { unpublishPrompt } from "./prompts.services";

const controller: Route["controller"] = {
  create: async ({ params }, context) => {
    return unpublishPrompt({ promptId: params.promptId }, context);
  },
};

export default controller;
