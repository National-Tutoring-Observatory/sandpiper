import requireAuth from "~/modules/authentication/helpers/requireAuth";
import resolveActiveTeam from "~/modules/teams/helpers/resolveActiveTeam.server";
import { TagService } from "../tag";
import type { Route } from "./+types/tagsList.route";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireAuth({ request });

  const teamId = await resolveActiveTeam(request, user);
  if (!teamId) {
    return { tags: [] };
  }

  const tags = await TagService.find({
    match: { team: teamId },
    sort: { name: 1 },
  });

  return { tags };
}
