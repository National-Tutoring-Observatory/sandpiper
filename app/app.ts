import { createRequestHandler } from "@react-router/express";
import type { Request } from "express";
import express from "express";
import "react-router";
import getRoutes from "~/modules/api/helpers/getApis";
import maintenanceMiddleware from "~/modules/systemSettings/maintenanceMiddleware";
import "~/modules/tokens/tokens.api";

declare module "react-router" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AppLoadContext {}
}

export const app = express();

app.use(maintenanceMiddleware);

getRoutes(app);

app.use((req, res, next) => {
  if (req.path.startsWith("/socket.io/")) {
    return next();
  }
  if (req.path.startsWith("/api/sockets")) {
    return next();
  }
  return createRequestHandler({
    build: () => import("virtual:react-router/server-build"),
    getLoadContext(req: Request) {
      return {
        io: req.io,
      };
    },
  })(req, res, next);
});
