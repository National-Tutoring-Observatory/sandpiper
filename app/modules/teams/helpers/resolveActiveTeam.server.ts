import type { User } from "~/modules/users/users.types";
import { TeamService } from "../team";
import { readActiveTeamFromRequest } from "./activeTeamCookie";

export default async function resolveActiveTeam(
  request: Request,
  user: User,
): Promise<string | null> {
  const userTeamIds = (user.teams ?? []).map((t) => t.team as string);
  if (userTeamIds.length === 0) return null;

  const cookieTeamId = readActiveTeamFromRequest(request);
  if (cookieTeamId && userTeamIds.includes(cookieTeamId)) {
    return cookieTeamId;
  }

  const personal = await TeamService.findOne({
    _id: { $in: userTeamIds },
    isPersonal: true,
  });
  return personal?._id ?? userTeamIds[0];
}
