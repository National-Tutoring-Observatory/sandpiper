import map from "lodash/map";
import { redirect, useLoaderData } from "react-router";
import type { Breadcrumb } from "~/modules/app/app.types";
import buildQueryFromParams from "~/modules/app/helpers/buildQueryFromParams";
import getQueryParamsFromRequest from "~/modules/app/helpers/getQueryParamsFromRequest.server";
import { useSearchQueryParams } from "~/modules/app/hooks/useSearchQueryParams";
import getSessionUserTeams from "~/modules/authentication/helpers/getSessionUserTeams";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import { TagService } from "../tag";
import type { Route } from "./+types/tags.route";
import TagsContainer from "./tags.container";

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAuth({ request });

  const authenticationTeams = await getSessionUserTeams({ request });
  const teamIds = map(authenticationTeams, "team");
  if (!teamIds.includes(params.teamId)) {
    return redirect("/");
  }

  const queryParams = getQueryParamsFromRequest(request, {
    searchValue: "",
    currentPage: 1,
    sort: "name",
    filters: {},
  });

  const query = buildQueryFromParams({
    match: { team: params.teamId },
    queryParams,
    searchableFields: ["name"],
    sortableFields: ["name", "createdAt"],
  });

  const tags = await TagService.paginate({ ...query });

  return { tags };
}

const breadcrumbs: Breadcrumb[] = [{ text: "Tags" }];

export default function TagsRoute() {
  const { tags } = useLoaderData<typeof loader>();

  const {
    searchValue,
    setSearchValue,
    currentPage,
    setCurrentPage,
    sortValue,
    setSortValue,
    filtersValues,
    setFiltersValues,
    isSyncing,
  } = useSearchQueryParams({
    searchValue: "",
    currentPage: 1,
    sortValue: "name",
    filters: {},
  });

  const onActionClicked = (action: string) => {
    console.warn("Tag action not yet implemented:", action);
  };

  const onItemActionClicked = ({
    id,
    action,
  }: {
    id: string;
    action: string;
  }) => {
    console.warn("Tag item action not yet implemented:", { id, action });
  };

  const onSearchValueChanged = (value: string) => {
    setSearchValue(value);
  };

  const onPaginationChanged = (page: number) => {
    setCurrentPage(page);
  };

  const onFiltersValueChanged = (
    filterValue: Record<string, string | null>,
  ) => {
    setFiltersValues({ ...filtersValues, ...filterValue });
  };

  const onSortValueChanged = (value: string) => {
    setSortValue(value);
  };

  return (
    <TagsContainer
      breadcrumbs={breadcrumbs}
      tags={tags.data}
      searchValue={searchValue}
      currentPage={currentPage}
      totalPages={tags.totalPages}
      filtersValues={filtersValues}
      sortValue={sortValue}
      isSyncing={isSyncing}
      onActionClicked={onActionClicked}
      onItemActionClicked={onItemActionClicked}
      onSearchValueChanged={onSearchValueChanged}
      onPaginationChanged={onPaginationChanged}
      onFiltersValueChanged={onFiltersValueChanged}
      onSortValueChanged={onSortValueChanged}
    />
  );
}
