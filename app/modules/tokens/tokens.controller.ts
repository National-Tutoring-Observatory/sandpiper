import type { Route } from "../api/api.types";
import { getTokensByActiveTeam } from "./tokens.services";

const controller: Route["controller"] = {
  list: async (_args, context) => {
    return getTokensByActiveTeam(context);
  },
};

export default controller;
