import type { Route } from "../api/api.types";
import { makeCodebookVersionProduction } from "./codebooks.services";
import getVersionParam from "./helpers/getVersionParam";

const controller: Route["controller"] = {
  create: async ({ params }, context) => {
    return makeCodebookVersionProduction(
      {
        codebookId: params.codebookId,
        version: getVersionParam(params.version),
      },
      context,
    );
  },
};

export default controller;
