import type { Route } from "../api/api.types";
import {
  createPrompt,
  deletePromptById,
  getPromptById,
  getPromptsByActiveTeam,
  updatePromptById,
} from "./prompts.services";
import type {
  CreatePromptInput,
  GetPromptsByActiveTeamInput,
} from "./prompts.types";

const controller: Route["controller"] = {
  list: async ({ query }, context) => {
    const { currentPage, searchValue, sort, annotationType } =
      query as GetPromptsByActiveTeamInput;
    return getPromptsByActiveTeam(
      { currentPage, searchValue, sort, annotationType },
      context,
    );
  },
  create: async ({ body }, context) => {
    return createPrompt(body as CreatePromptInput, context);
  },
  read: async ({ params }, context) => {
    const { promptId } = params;
    return getPromptById({ promptId }, context);
  },
  update: async ({ params, body }, context) => {
    const { promptId } = params;
    return updatePromptById({ promptId, name: body.name as string }, context);
  },
  delete: async ({ params }, context) => {
    const { promptId } = params;
    return deletePromptById({ promptId }, context);
  },
};

export default controller;
