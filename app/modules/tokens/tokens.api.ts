import { z } from "zod";
import registerApi from "../api/helpers/registerApi";
import { isAuthenticated } from "../authentication/authentication.middleware";
import { isTeamAdmin } from "../teams/teams.middleware";
import controller from "./tokens.controller.js";
import regenerateController from "./tokensRegenerate.controller.js";

const listQuery = {
  currentPage: z.coerce.number().int().min(1).optional(),
};

const createBody = {
  name: z.string().trim().min(1).max(100),
  expiresAt: z.coerce.date().optional(),
};

const updateBody = {
  name: z.string().trim().min(1).max(100),
};

registerApi([
  {
    basePath: "/tokens",
    controller,
    list: {
      query: listQuery,
      middleware: [isAuthenticated],
    },
    create: {
      body: createBody,
      middleware: [isAuthenticated, isTeamAdmin],
    },
    update: {
      param: "id",
      body: updateBody,
      middleware: [isAuthenticated, isTeamAdmin],
    },
    delete: {
      param: "id",
      middleware: [isAuthenticated, isTeamAdmin],
    },
  },
  {
    basePath: "/tokens/:id/regenerate",
    controller: regenerateController,
    create: {
      param: "id",
      middleware: [isAuthenticated, isTeamAdmin],
    },
  },
]);
