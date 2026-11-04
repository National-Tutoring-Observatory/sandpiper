import type { Route } from "./api.types";

const controller: Route["controller"] = {
  create: async ({ body }) => {
    console.log(body);
    return {
      data: { version: "v1.0.0" },
    };
  },
};

export default controller;
