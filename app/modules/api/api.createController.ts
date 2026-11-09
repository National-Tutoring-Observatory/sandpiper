import { createProjectSession, createRunSet } from "./api.services";
import type { Route } from "./api.types";

const controller: Route["controller"] = {
  create: async ({ body }, context) => {
    if (body.type === "RUN_SET") {
      return createRunSet(
        {
          projectId: body.projectId as string,
          promptId: body.promptId as string | undefined,
          models: body.models as string[] | undefined,
          shouldRunVerification: body.shouldRunVerification as
            | boolean
            | undefined,
          latestSessionLimit: body.latestSessionLimit as number | undefined,
        },
        context,
      );
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
