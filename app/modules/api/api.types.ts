import type { Request, RequestHandler, Response } from "express";
import type { ZodRawShape } from "zod";
import type { User } from "~/modules/users/users.types";

declare module "express-serve-static-core" {
  interface Request {
    files?: Record<string, unknown> | undefined;
    user?: User;
    activeTeam?: string;
  }
}

export type RouteOperation = "list" | "create" | "read" | "update" | "delete";

export interface RouteItemConfig {
  param?: string;
  body?: ZodRawShape;
  query?: ZodRawShape;
  files?: ZodRawShape;
  middleware?: RequestHandler[];
  props?: Record<string, unknown>;
  hasCors?: boolean;
  shouldSkipValidation?: boolean;
  shouldSkipRateLimit?: boolean;
  rateLimit?: number;
}

export interface ControllerMethodArgs {
  param?: string;
  body: Record<string, unknown>;
  query: Record<string, unknown>;
  files: Record<string, unknown>;
  props?: Record<string, unknown>;
}

export interface ControllerContext {
  req: Request;
  res: Response;
  user?: User;
  activeTeam: string | null;
}

export interface ApiSuccess<T = unknown> {
  data: T;
}

export interface ApiError {
  error: {
    message: string;
    statusCode: number;
    issues?: unknown;
  };
}

export type ControllerMethod = (
  args: ControllerMethodArgs,
  context: ControllerContext,
) => ApiSuccess | Promise<ApiSuccess>;

export interface Route {
  basePath: string;
  controller: Partial<Record<RouteOperation, ControllerMethod>>;
  list?: RouteItemConfig;
  create?: RouteItemConfig;
  read?: RouteItemConfig;
  update?: RouteItemConfig;
  delete?: RouteItemConfig;
}
