import type { RequestHandler } from "express";
import { z, type ZodRawShape } from "zod";

export interface HandleValidationOptions {
  body?: ZodRawShape;
  query?: ZodRawShape;
  files?: ZodRawShape;
  shouldSkipValidation?: boolean;
}

export interface ParsedRequest {
  body: Record<string, unknown>;
  query: Record<string, unknown>;
  files: Record<string, unknown>;
}

export default function handleValidation({
  body,
  query,
  files,
  shouldSkipValidation,
}: HandleValidationOptions): RequestHandler {
  const bodySchema =
    body && Object.keys(body).length ? z.object(body).strict() : null;
  const querySchema =
    query && Object.keys(query).length ? z.object(query).strict() : null;
  const filesSchema =
    files && Object.keys(files).length ? z.object(files).strict() : null;

  return (req, res, next) => {
    if (shouldSkipValidation) {
      return next();
    }

    try {
      const parsed: ParsedRequest = { body: {}, query: {}, files: {} };

      if (bodySchema) {
        parsed.body = bodySchema.parse(req.body);
      }
      if (querySchema) {
        parsed.query = querySchema.parse(req.query);
      }
      if (filesSchema) {
        parsed.files = filesSchema.parse(req.files);
      }

      res.locals.parsed = parsed;
      return next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: {
            message: "Validation failed",
            statusCode: 400,
            issues: error.issues,
          },
        });
      }
      return res.status(400).json({
        error: { message: String(error), statusCode: 400 },
      });
    }
  };
}
