import type { Route } from "../api/api.types";
import {
  createToken,
  deleteTokenById,
  getTokensByActiveTeam,
} from "./tokens.services";
import type {
  CreateTokenInput,
  GetTokensByActiveTeamInput,
} from "./tokens.types";

const controller: Route["controller"] = {
  list: async ({ query }, context) => {
    const { currentPage } = query as GetTokensByActiveTeamInput;
    return getTokensByActiveTeam({ currentPage }, context);
  },
  create: async ({ body }, context) => {
    return createToken(body as CreateTokenInput, context);
  },
  delete: async ({ param }, context) => {
    if (!param) throw { statusCode: 400, message: "Missing id" };
    return deleteTokenById({ tokenId: param }, context);
  },
};

export default controller;
