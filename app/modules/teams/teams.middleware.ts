import type { RequestHandler } from "express";
import getActiveTeam from "../api/helpers/getActiveTeam";
import { userIsTeamAdmin } from "../authorization/helpers/teamMembership";

export const isTeamAdmin: RequestHandler = (req, res, next) => {
  const activeTeam = getActiveTeam(req);

  if (!activeTeam || !userIsTeamAdmin(req.user ?? null, activeTeam)) {
    res.status(403).json({
      error: { message: "Team admin required", statusCode: 403 },
    });
    return;
  }

  next();
};
