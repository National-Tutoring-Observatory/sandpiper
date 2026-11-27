import type { Route } from "../api/api.types";
import {
  createNextCodebookVersion,
  getCodebookVersion,
  getCodebookVersions,
  updateCodebookVersion,
} from "./codebooks.services";
import type { UpdateCodebookVersionInput } from "./codebooks.types";
import getVersionParam from "./helpers/getVersionParam";

const controller: Route["controller"] = {
  list: async ({ params }, context) => {
    const { codebookId } = params;
    return getCodebookVersions({ codebookId }, context);
  },
  create: async ({ params, body }, context) => {
    const { codebookId } = params;
    return createNextCodebookVersion(
      { codebookId, version: body.version as number },
      context,
    );
  },
  read: async ({ params }, context) => {
    const { codebookId } = params;
    const version = getVersionParam(params.version);
    return getCodebookVersion({ codebookId, version }, context);
  },
  update: async ({ params, body }, context) => {
    const { codebookId } = params;
    const version = getVersionParam(params.version);
    const { name, categories } = body as Pick<
      UpdateCodebookVersionInput,
      "name" | "categories"
    >;
    return updateCodebookVersion(
      { codebookId, version, name, categories },
      context,
    );
  },
};

export default controller;
