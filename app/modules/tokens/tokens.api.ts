import { z } from "zod";
import registerApi from "../api/helpers/registerApi";
import { isAuthenticated } from "../authentication/authentication.middleware";
import { isTeamAdmin } from "../teams/teams.middleware";
import controller from "./tokens.controller.js";
import { TOKEN_EXPIRATION_DAYS } from "./tokens.types";
import regenerateController from "./tokensRegenerate.controller.js";

const teamQuery = {
  teamId: z.string().regex(/^[a-f0-9]{24}$/),
};

const listQuery = {
  ...teamQuery,
  currentPage: z.coerce.number().int().min(1).optional(),
  searchValue: z.string().trim().max(100).optional(),
};

const createBody = {
  name: z.string().trim().min(1).max(100),
  expiresInDays: z.literal([...TOKEN_EXPIRATION_DAYS]),
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
      middleware: [isAuthenticated, isTeamAdmin],
    },
    create: {
      body: createBody,
      query: teamQuery,
      middleware: [isAuthenticated, isTeamAdmin],
    },
    update: {
      param: "id",
      body: updateBody,
      query: teamQuery,
      middleware: [isAuthenticated, isTeamAdmin],
    },
    delete: {
      param: "id",
      query: teamQuery,
      middleware: [isAuthenticated, isTeamAdmin],
    },
  },
  {
    basePath: "/tokens/:id/regenerate",
    controller: regenerateController,
    create: {
      param: "id",
      query: teamQuery,
      middleware: [isAuthenticated, isTeamAdmin],
    },
  },
]);
