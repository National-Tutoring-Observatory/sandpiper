import { z } from "zod";
import registerApi from "../api/helpers/registerApi";
import { isAuthenticated } from "../authentication/authentication.middleware";
import controller from "./tokens.controller.js";

const listQuery = {
  currentPage: z.coerce.number().int().min(1).optional(),
};

const createBody = {
  name: z.string().trim().min(1).max(100),
  expiresAt: z.coerce.date().optional(),
};

registerApi({
  basePath: "/tokens",
  controller,
  list: {
    query: listQuery,
    middleware: [isAuthenticated],
  },
  create: {
    body: createBody,
    middleware: [isAuthenticated],
  },
  delete: {
    param: "id",
    middleware: [isAuthenticated],
  },
});
