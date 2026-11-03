import type { Route } from "./api.types";

const controller: Route["controller"] = {
  list: async () => {
    return {
      data: { isAuthenticated: false, version: "v1.0.0" },
    };
  },
};

export default controller;
