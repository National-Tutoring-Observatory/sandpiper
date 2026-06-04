import { useContext } from "react";
import { redirect } from "react-router";
import buildQueryFromParams from "~/modules/app/helpers/buildQueryFromParams";
import getQueryParamsFromRequest from "~/modules/app/helpers/getQueryParamsFromRequest.server";
import { useSearchQueryParams } from "~/modules/app/hooks/useSearchQueryParams";
import { AuthenticationContext } from "~/modules/authentication/authentication.context";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import { TeamBillingService } from "~/modules/billing/teamBilling";
import type { User } from "~/modules/users/users.types";
import Teams from "../components/teams";
import { TeamService } from "../team";
import type { Route } from "./+types/teams.route";

export async function loader({ request }: Route.LoaderArgs) {
  const userSession = await requireAuth({ request });

  if (userSession.role !== "SUPER_ADMIN") return redirect("/");

  const queryParams = getQueryParamsFromRequest(request, {
    searchValue: "",
    currentPage: 1,
    sort: "name",
    filters: {},
  });

  const query = buildQueryFromParams({
    match: {},
    queryParams,
    searchableFields: ["name"],
    sortableFields: ["name", "createdAt"],
    filterableFields: [],
  });

  const teams = await TeamService.paginate({
    match: query.match,
    sort: query.sort,
    page: query.page,
  });

  const balances: Record<string, number> = Object.fromEntries(
    await Promise.all(
      teams.data.map(async (team) => [
        team._id,
        await TeamBillingService.getBalance(team._id),
      ]),
    ),
  );

  return { teams, balances };
}

export function HydrateFallback() {
  return <div>Loading...</div>;
}

export default function TeamsRoute({ loaderData }: Route.ComponentProps) {
  const { teams, balances } = loaderData;
  const user = useContext(AuthenticationContext) as User;

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

  const breadcrumbs = [{ text: "Teams" }];

  return (
    <Teams
      teams={teams?.data}
      user={user}
      balances={balances}
      breadcrumbs={breadcrumbs}
      searchValue={searchValue}
      currentPage={currentPage}
      totalPages={teams.totalPages}
      filtersValues={filtersValues}
      sortValue={sortValue}
      isSyncing={isSyncing}
      onSearchValueChanged={setSearchValue}
      onPaginationChanged={setCurrentPage}
      onFiltersValueChanged={(filterValue) =>
        setFiltersValues({ ...filtersValues, ...filterValue })
      }
      onSortValueChanged={setSortValue}
    />
  );
}
