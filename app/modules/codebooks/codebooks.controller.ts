import type { Route } from "../api/api.types";
import {
  createCodebook,
  deleteCodebookById,
  getCodebookById,
  getCodebooksByActiveTeam,
  updateCodebookById,
} from "./codebooks.services";
import type {
  CreateCodebookInput,
  GetCodebooksByActiveTeamInput,
  UpdateCodebookInput,
} from "./codebooks.types";

const controller: Route["controller"] = {
  list: async ({ query }, context) => {
    const { currentPage, searchValue, sort } =
      query as GetCodebooksByActiveTeamInput;
    return getCodebooksByActiveTeam(
      { currentPage, searchValue, sort },
      context,
    );
  },
  create: async ({ body }, context) => {
    return createCodebook(body as CreateCodebookInput, context);
  },
  read: async ({ params }, context) => {
    const { codebookId } = params;
    return getCodebookById({ codebookId }, context);
  },
  update: async ({ params, body }, context) => {
    const { codebookId } = params;
    const { name, description } = body as Omit<
      UpdateCodebookInput,
      "codebookId"
    >;
    return updateCodebookById({ codebookId, name, description }, context);
  },
  delete: async ({ params }, context) => {
    const { codebookId } = params;
    return deleteCodebookById({ codebookId }, context);
  },
};

export default controller;
