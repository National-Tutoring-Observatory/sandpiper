import type { RequestHandler } from "express";
import type { ControllerMethod, ControllerMethodArgs } from "../api.types";
import type { ParsedRequest } from "./handleValidation";

export interface HandleRouteOptions {
  param?: string;
  props?: Record<string, unknown>;
  method: ControllerMethod;
}

interface StatusCodeError {
  statusCode: number;
  message?: string;
  code?: string;
}

function isStatusCodeError(error: unknown): error is StatusCodeError {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof (error as { statusCode: unknown }).statusCode === "number"
  );
}

function errorCode(error: unknown): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }
  return undefined;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return String(error);
}

export default function handleRoute({
  param,
  props,
  method,
}: HandleRouteOptions): RequestHandler {
  return async (req, res) => {
    try {
      const parsed = res.locals.parsed as ParsedRequest | undefined;

      const methodArguments: ControllerMethodArgs = {
        body: parsed?.body ?? {},
        query: parsed?.query ?? {},
        files: parsed?.files ?? {},
      };
      if (param) {
        const paramValue = req.params[param];
        if (paramValue !== undefined) {
          methodArguments.param = Array.isArray(paramValue)
            ? paramValue[0]
            : paramValue;
        }
      }
      if (props) methodArguments.props = props;

      const response = await method(methodArguments, {
        req,
        res,
        user: req.user,
      });

      if (
        typeof response !== "object" ||
        response === null ||
        !("data" in response)
      ) {
        console.error("Controller returned malformed response", {
          path: req.path,
          method: req.method,
          response,
        });
        res.status(500).json({
          error: {
            message: "Server returned malformed response",
            statusCode: 500,
          },
        });
        return;
      }

      if (res.headersSent || res.writableEnded) return;
      res.json(response);
    } catch (error) {
      if (isStatusCodeError(error)) {
        const code = errorCode(error);
        res.status(error.statusCode).json({
          error: {
            message: errorMessage(error),
            statusCode: error.statusCode,
            ...(code ? { code } : {}),
          },
        });
        return;
      }
      console.warn(error);
      res.status(500).json({
        error: { message: errorMessage(error), statusCode: 500 },
      });
    }
  };
}
