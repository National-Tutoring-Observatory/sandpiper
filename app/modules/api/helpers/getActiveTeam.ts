import type { Request } from "express";

const ACTIVE_TEAM_COOKIE = "sandpiper.activeTeamId";

export default function getActiveTeam(req: Request): string | null {
  if (!req.user) return null;
  const userTeamIds = req.user.teams.map((t) => t.team);
  const cookieTeamId = req.headers.cookie
    ?.split(";")
    .map((part) => part.trim().split("="))
    .find(([name]) => name === ACTIVE_TEAM_COOKIE)?.[1];

  if (cookieTeamId && userTeamIds.includes(cookieTeamId)) return cookieTeamId;
  return userTeamIds[0] ?? null;
}
