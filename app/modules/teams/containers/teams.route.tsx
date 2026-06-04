import find from "lodash/find";
import map from "lodash/map";
import { useContext, useEffect } from "react";
import { data, useFetcher, useNavigate } from "react-router";
import { toast } from "sonner";
import buildQueryFromParams from "~/modules/app/helpers/buildQueryFromParams";
import getQueryParamsFromRequest from "~/modules/app/helpers/getQueryParamsFromRequest.server";
import { useSearchQueryParams } from "~/modules/app/hooks/useSearchQueryParams";
import { AuthenticationContext } from "~/modules/authentication/authentication.context";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import { TeamBillingService } from "~/modules/billing/teamBilling";
import addDialog from "~/modules/dialogs/addDialog";
import type { User } from "~/modules/users/users.types";
import TeamAuthorization from "../authorization";
import CreateTeamDialog from "../components/createTeamDialog";
import EditTeamDialog from "../components/editTeamDialog";
import Teams from "../components/teams";
import { TeamService } from "../team";
import type { Team } from "../teams.types";
import type { Route } from "./+types/teams.route";

export async function loader({ request }: Route.LoaderArgs) {
  const userSession = await requireAuth({ request });

  let match = {};
  if (userSession.role !== "SUPER_ADMIN") {
    const teamIds = map(userSession.teams, "team");
    match = { _id: { $in: teamIds } };
  }

  const queryParams = getQueryParamsFromRequest(request, {
    searchValue: "",
    currentPage: 1,
    sort: "name",
    filters: {},
  });

  const query = buildQueryFromParams({
    match,
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

  const balances: Record<string, number> =
    userSession.role === "SUPER_ADMIN"
      ? Object.fromEntries(
          await Promise.all(
            teams.data.map(async (team) => [
              team._id,
              await TeamBillingService.getBalance(team._id),
            ]),
          ),
        )
      : {};

  return { teams, balances };
}

export async function action({ request }: Route.ActionArgs) {
  const { intent, payload = {} } = await request.json();

  const { name } = payload;

  const user = await requireAuth({ request });

  switch (intent) {
    case "CREATE_TEAM": {
      if (!TeamAuthorization.canCreate(user)) {
        return data(
          {
            errors: {
              general: "Insufficient permissions.",
            },
          },
          { status: 403 },
        );
      }
      if (typeof name !== "string") {
        return data(
          {
            errors: {
              general: "Team name is required and must be a string.",
            },
          },
          { status: 400 },
        );
      }
      const team = await TeamService.createForUser(name, user._id);
      await TeamBillingService.setupTeamBilling(team._id);
      return data({
        success: true,
        intent: "CREATE_TEAM",
        data: team,
      });
    }
    default:
      return data({ errors: { general: "Invalid intent" } }, { status: 400 });
  }
}

export function HydrateFallback() {
  return <div>Loading...</div>;
}

export default function TeamsRoute({ loaderData }: Route.ComponentProps) {
  const { teams, balances } = loaderData;
  const user = useContext(AuthenticationContext) as User;
  const fetcher = useFetcher();
  const navigate = useNavigate();

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

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      if (fetcher.data.success && fetcher.data.intent === "CREATE_TEAM") {
        toast.success("Team created");
        navigate(`/teams/${fetcher.data.data._id}/users`);
      } else if (
        fetcher.data.success &&
        fetcher.data.intent === "UPDATE_TEAM"
      ) {
        toast.success("Team updated");
        addDialog(null);
      } else if (fetcher.data.errors) {
        toast.error(fetcher.data.errors.general || "An error occurred");
      }
    }
  }, [fetcher.state, fetcher.data, navigate]);

  const breadcrumbs = [{ text: "Teams" }];

  const openCreateTeamDialog = () => {
    addDialog(<CreateTeamDialog onCreateNewTeamClicked={submitCreateTeam} />);
  };

  const openEditTeamDialog = (team: Team) => {
    addDialog(
      <EditTeamDialog team={team} onEditTeamClicked={submitEditTeam} />,
    );
  };

  const submitCreateTeam = (name: string) => {
    fetcher.submit(
      JSON.stringify({ intent: "CREATE_TEAM", payload: { name } }),
      {
        method: "POST",
        encType: "application/json",
      },
    );
  };

  const submitEditTeam = (team: Team) => {
    fetcher.submit(
      JSON.stringify({
        intent: "UPDATE_TEAM",
        payload: { name: team.name },
      }),
      {
        method: "PUT",
        encType: "application/json",
        action: `/teams/${team._id}`,
      },
    );
  };

  const onActionClicked = (action: string) => {
    if (action === "CREATE") {
      openCreateTeamDialog();
    }
  };

  const onItemActionClicked = ({
    id,
    action,
  }: {
    id: string;
    action: string;
  }) => {
    const team = find(teams.data, { _id: id }) as Team | undefined;
    if (!team) return null;
    switch (action) {
      case "EDIT":
        openEditTeamDialog(team);
        break;
    }
  };

  const onSearchValueChanged = (searchValue: string) => {
    setSearchValue(searchValue);
  };

  const onPaginationChanged = (currentPage: number) => {
    setCurrentPage(currentPage);
  };

  const onFiltersValueChanged = (
    filterValue: Record<string, string | null>,
  ) => {
    setFiltersValues({ ...filtersValues, ...filterValue });
  };

  const onSortValueChanged = (sortValue: string) => {
    setSortValue(sortValue);
  };

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
      onActionClicked={onActionClicked}
      onItemActionClicked={onItemActionClicked}
      onSearchValueChanged={onSearchValueChanged}
      onPaginationChanged={onPaginationChanged}
      onFiltersValueChanged={onFiltersValueChanged}
      onSortValueChanged={onSortValueChanged}
    />
  );
}
