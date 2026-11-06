import { z } from "zod";
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
        session: z.looseObject({}),
      },
      bodyLimit: "1mb",
      rateLimit: 10,
      middleware: [hasApiKey],
    },
  },
]);
