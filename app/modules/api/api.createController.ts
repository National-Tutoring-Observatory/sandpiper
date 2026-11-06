import { createProjectSession, createRunSet } from "./api.services";
import type { CreateRunSetInput, Route } from "./api.types";

const controller: Route["controller"] = {
  create: async ({ body }, context) => {
    if (body.type === "RUN_SET") {
      return createRunSet(body as CreateRunSetInput, context);
    }
    if (body.type === "SESSION") {
      return createProjectSession(
        {
          projectId: body.projectId as string,
          session: body.session as Record<string, unknown>,
        },
        context,
      );
    }
    throw { statusCode: 400, message: "Invalid type" };
  },
};

export default controller;
