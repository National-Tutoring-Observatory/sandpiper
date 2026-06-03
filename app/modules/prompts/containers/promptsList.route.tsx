import map from "lodash/map";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import isValidAnnotationType from "../helpers/isValidAnnotationType";
import { PromptService } from "../prompt";
import type { Route } from "./+types/promptsList.route";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireAuth({ request });
  const teamIds = map(user.teams, "team");
  const url = new URL(request.url);
  const annotationType = url.searchParams.get("annotationType");
  const teamFilter = url.searchParams.get("team");

  if (!isValidAnnotationType(annotationType)) {
    throw new Error("Invalid or missing annotationType");
  }

  if (teamFilter && !teamIds.includes(teamFilter)) {
    throw new Response("Forbidden", { status: 403 });
  }

  const prompts = await PromptService.findWithSavedVersions({
    match: {
      annotationType,
      team: teamFilter ?? { $in: teamIds },
      deletedAt: { $exists: false },
    },
  });

  return { prompts: { data: prompts } };
}
