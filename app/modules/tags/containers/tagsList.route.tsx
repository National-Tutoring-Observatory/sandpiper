import { data } from "react-router";
import buildQueryFromParams from "~/modules/app/helpers/buildQueryFromParams";
import getQueryParamsFromRequest from "~/modules/app/helpers/getQueryParamsFromRequest.server";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import resolveActiveTeam from "~/modules/teams/helpers/resolveActiveTeam.server";
import TagAuthorization from "../authorization";
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

export async function action({ request }: Route.ActionArgs) {
  const user = await requireAuth({ request });

  const teamId = await resolveActiveTeam(request, user);
  if (!teamId || !TagAuthorization.canCreate(user, teamId)) {
    return data({ errors: { general: "Access denied" } }, { status: 403 });
  }

  const payload = await request.json();

  if (payload.intent === "CREATE_TAG") {
    const newTag = payload.data;
    const name = newTag?.name?.trim();
    if (!name) {
      return data({ errors: { name: "Name is required" } }, { status: 400 });
    }

    const tag = await TagService.create({
      name,
      description: newTag.description,
      color: newTag.color,
      team: teamId,
      createdBy: user._id,
    });

    return data({ success: true, intent: "CREATE_TAG", tag });
  }

  return data({ errors: { general: "Invalid intent" } }, { status: 400 });
}
