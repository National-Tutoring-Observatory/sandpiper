import type { Route } from "../api/api.types";
import getVersionParam from "./helpers/getVersionParam";
import {
  createNextPromptVersion,
  getPromptVersion,
  getPromptVersions,
  updatePromptVersion,
} from "./prompts.services";
import type { UpdatePromptVersionInput } from "./prompts.types";

const controller: Route["controller"] = {
  list: async ({ params, query }, context) => {
    const { promptId } = params;
    return getPromptVersions(
      { promptId, hasBeenSaved: query.hasBeenSaved === "true" },
      context,
    );
  },
  create: async ({ params, body }, context) => {
    const { promptId } = params;
    return createNextPromptVersion(
      { promptId, version: body.version as number },
      context,
    );
  },
  read: async ({ params }, context) => {
    const { promptId } = params;
    const version = getVersionParam(params.version);
    return getPromptVersion({ promptId, version }, context);
  },
  update: async ({ params, body }, context) => {
    const { promptId } = params;
    const version = getVersionParam(params.version);
    const { name, userPrompt, annotationSchema } = body as Pick<
      UpdatePromptVersionInput,
      "name" | "userPrompt" | "annotationSchema"
    >;
    return updatePromptVersion(
      { promptId, version, name, userPrompt, annotationSchema },
      context,
    );
  },
};

export default controller;
