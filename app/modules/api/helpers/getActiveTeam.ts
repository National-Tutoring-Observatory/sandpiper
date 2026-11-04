import type { Request } from "express";

export default function getActiveTeam(req: Request): string | null {
  if (req.activeTeam) return req.activeTeam;
  if (!req.user) return null;
  const teamId = req.query?.teamId;
  if (typeof teamId !== "string") return null;
  const userTeamIds = req.user.teams.map((t) => t.team);
  return userTeamIds.includes(teamId) ? teamId : null;
}
