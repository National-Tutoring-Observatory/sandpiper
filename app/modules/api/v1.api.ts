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
        type: z.string(),
        projectId: z.string(),
        sessions: z.array(z.string()),
      },
      rateLimit: 10,
      middleware: [hasApiKey],
    },
  },
]);
