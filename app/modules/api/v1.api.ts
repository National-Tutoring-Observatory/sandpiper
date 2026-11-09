import { z } from "zod";
import { getAvailableModels } from "~/modules/llm/modelRegistry";
import controller from "./api.controller.js";
import createController from "./api.createController.js";
import { hasApiKey } from "./api.middleware.js";
import registerApi from "./helpers/registerApi";

registerApi([
  {
    basePath: "/v1",
    controller,
    list: {
      rateLimit: 10,
      middleware: [hasApiKey],
    },
  },
  {
    basePath: "/v1/create",
    controller: createController,
    create: {
      body: {
        type: z.enum(["RUN_SET", "SESSION"]),
        projectId: z.string(),
        promptId: z.string().optional(),
        models: z
          .array(z.enum(getAvailableModels().map((model) => model.code)))
          .optional(),
        shouldRunVerification: z.boolean().optional(),
        latestSessionLimit: z.number().int().positive().optional(),
        session: z.looseObject({}).optional(),
      },
      bodyLimit: "1mb",
      rateLimit: 10,
      middleware: [hasApiKey],
    },
  },
]);
