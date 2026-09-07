import buildQueryFromParams from "~/modules/app/helpers/buildQueryFromParams";
import getQueryParamsFromRequest from "~/modules/app/helpers/getQueryParamsFromRequest.server";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import resolveActiveTeam from "~/modules/teams/helpers/resolveActiveTeam.server";
import { TagService } from "../tag";
import type { Route } from "./+types/tagsList.route";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireAuth({ request });

  const teamId = await resolveActiveTeam(request, user);
  if (!teamId) {
    return { tags: { data: [], count: 0, totalPages: 0 } };
  }

  const queryParams = getQueryParamsFromRequest(request, {
    searchValue: "",
    currentPage: 1,
    sort: "name",
    filters: {},
  });

  const query = buildQueryFromParams({
    match: { team: teamId },
    queryParams,
    searchableFields: ["name"],
    sortableFields: ["name", "createdAt"],
  });

  const tags = await TagService.paginate({ ...query });

  return { tags };
}
