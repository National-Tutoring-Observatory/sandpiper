import type { Route } from "../api/api.types";
import getVersionParam from "./helpers/getVersionParam";
import { makePromptVersionProduction } from "./prompts.services";

const controller: Route["controller"] = {
  create: async ({ params }, context) => {
    return makePromptVersionProduction(
      {
        promptId: params.promptId,
        version: getVersionParam(params.version),
      },
      context,
    );
  },
};

export default controller;
