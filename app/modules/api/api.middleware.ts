import type { RequestHandler } from "express";
import { UserService } from "~/modules/users/user";
import {
  consumeTokenUsage,
  findValidTokenByApiKey,
} from "../tokens/tokens.services";

export const hasApiKey: RequestHandler = async (req, res, next) => {
  const [scheme, apiKey] = req.headers.authorization?.split(" ") ?? [];
  const token =
    scheme === "Bearer" && apiKey ? await findValidTokenByApiKey(apiKey) : null;
  const user = token?.createdBy
    ? await UserService.findById(String(token.createdBy))
    : null;

  const isTeamMember =
    token?.refType === "team" &&
    !!user?.teams.some(({ team }) => team === String(token.ref));

  if (!token || !user || !isTeamMember) {
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

  req.user = user;
  req.activeTeam = String(token.ref);

  next();
};
