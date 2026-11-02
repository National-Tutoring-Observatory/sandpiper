import cors from "cors";
import type { Express, RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import type { RouteOperation } from "../api.types";
import ROUTES from "../apis";
import handleRoute from "./handleApi";
import handleValidation from "./handleValidation";

type HttpMethod = "get" | "post" | "put" | "delete";

interface RouteMapping {
  hasParam: boolean;
  method: HttpMethod;
}

const ROUTE_MAPPINGS: Record<RouteOperation, RouteMapping> = {
  list: { hasParam: false, method: "get" },
  create: { hasParam: false, method: "post" },
  read: { hasParam: true, method: "get" },
  update: { hasParam: true, method: "put" },
  delete: { hasParam: true, method: "delete" },
};

export default function getRoutes(app: Express): void {
  const apiPrefix = process.env.API_PREFIX ?? "/api";

  for (const route of ROUTES) {
    if (!route.controller) continue;

    for (const [opKey, mapping] of Object.entries(ROUTE_MAPPINGS) as Array<
      [RouteOperation, RouteMapping]
    >) {
      const routeItem = route[opKey];
      if (!routeItem) continue;

      const controllerMethod = route.controller[opKey];
      if (!controllerMethod) continue;

      const routeItemParam =
        mapping.hasParam && routeItem.param ? `/:${routeItem.param}` : "";
      const path = `${apiPrefix}${route.basePath}${routeItemParam}`;

      const rateLimitMax = routeItem.rateLimit ?? 200;
      const limiter = rateLimit({
        windowMs: rateLimitMax <= 5 ? 15 * 60 * 1000 : 60 * 1000,
        limit: rateLimitMax,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        skip: () => routeItem.shouldSkipRateLimit ?? false,
        handler: (_req, res, _next, options) => {
          res.status(options.statusCode).json({
            message: "Too many requests, please try again later.",
            statusCode: options.statusCode,
          });
        },
      });

      const middlewares: RequestHandler[] = [];
      if (routeItem.hasCors) {
        app.options(path, cors());
        middlewares.push(cors());
      }
      middlewares.push(limiter);
      middlewares.push(...(routeItem.middleware ?? []));
      middlewares.push(
        handleValidation({
          body: routeItem.body,
          query: routeItem.query,
          files: routeItem.files,
          shouldSkipValidation: routeItem.shouldSkipValidation,
        }),
      );
      middlewares.push(
        handleRoute({
          param: routeItem.param,
          props: routeItem.props,
          method: controllerMethod,
        }),
      );

      app[mapping.method](path, ...middlewares);
    }
  }
}
