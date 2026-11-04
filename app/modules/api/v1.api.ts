import controller from "./api.controller.js";
import { hasApiKey } from "./api.middleware.js";
import registerApi from "./helpers/registerApi";

registerApi({
  basePath: "/v1",
  controller,
  list: {
    rateLimit: 10,
    middleware: [hasApiKey],
  },
});
