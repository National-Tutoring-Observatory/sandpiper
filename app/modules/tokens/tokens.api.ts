import registerApi from "../api/helpers/registerApi";
import { isAuthenticated } from "../authentication/authentication.middleware";
import controller from "./tokens.controller.js";

registerApi({
  basePath: "/tokens",
  controller,
  list: {
    middleware: [isAuthenticated],
  },
});
