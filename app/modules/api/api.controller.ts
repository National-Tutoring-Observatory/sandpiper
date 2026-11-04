import type { Route } from "./api.types";

const controller: Route["controller"] = {
  list: async (args, context) => {
    return {
      data: {
        version: "v1.0.0",
        user: context.user?._id,
        team: context.activeTeam,
      },
    };
  },
};

export default controller;
