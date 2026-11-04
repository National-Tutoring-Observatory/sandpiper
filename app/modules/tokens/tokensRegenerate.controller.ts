import type { Route } from "../api/api.types";
import { regenerateTokenById } from "./tokens.services";

const controller: Route["controller"] = {
  create: async ({ param }, context) => {
    if (!param) throw { statusCode: 400, message: "Missing id" };
    return regenerateTokenById({ tokenId: param }, context);
  },
};

export default controller;
