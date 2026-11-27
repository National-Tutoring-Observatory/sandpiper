import type { Route } from "../api/api.types";
import { getSavedPrompts } from "./prompts.services";
import type { GetSavedPromptsInput } from "./prompts.types";

const controller: Route["controller"] = {
  list: async ({ query }, context) => {
    const { annotationType } = query as GetSavedPromptsInput;
    return getSavedPrompts({ annotationType }, context);
  },
};

export default controller;
