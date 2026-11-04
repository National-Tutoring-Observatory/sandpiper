import type { RequestHandler } from "express";
import {
  consumeTokenUsage,
  findValidTokenByApiKey,
} from "../tokens/tokens.services";

export const hasApiKey: RequestHandler = async (req, res, next) => {
  const [scheme, apiKey] = req.headers.authorization?.split(" ") ?? [];
  const token =
    scheme === "Bearer" && apiKey ? await findValidTokenByApiKey(apiKey) : null;

  if (!token) {
    res.status(401).json({
      error: { message: "Valid API key required", statusCode: 401 },
    });
    return;
  }

  const isWithinRateLimit = await consumeTokenUsage(String(token._id));

  if (!isWithinRateLimit) {
    res.status(429).json({
      error: { message: "Rate limit exceeded", statusCode: 429 },
    });
    return;
  }

  next();
};
