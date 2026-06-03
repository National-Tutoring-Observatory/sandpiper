import map from "lodash/map";
import mongoose from "mongoose";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import { TeamService } from "../team";
import type { Route } from "./+types/availableTeams.route";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireAuth({ request });
  const teamIds = new Set<string>(map(user.teams, "team"));

  const url = new URL(request.url);
  const include = url.searchParams.get("include");
  if (
    include &&
    mongoose.isValidObjectId(include) &&
    user.role === "SUPER_ADMIN"
  ) {
    teamIds.add(include);
  }

  const result = await TeamService.find({
    match: { _id: { $in: [...teamIds] } },
  });

  return { teams: { data: result } };
}
