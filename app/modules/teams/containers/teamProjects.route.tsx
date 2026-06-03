import find from "lodash/find";
import { useContext } from "react";
import {
  redirect,
  useLoaderData,
  useNavigate,
  useOutletContext,
  useParams,
} from "react-router";
import buildQueryFromParams from "~/modules/app/helpers/buildQueryFromParams";
import getQueryParamsFromRequest from "~/modules/app/helpers/getQueryParamsFromRequest.server";
import { useSearchQueryParams } from "~/modules/app/hooks/useSearchQueryParams";
import { AuthenticationContext } from "~/modules/authentication/authentication.context";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import addDialog from "~/modules/dialogs/addDialog";
import ProjectAuthorization from "~/modules/projects/authorization";
import CreateProjectDialog from "~/modules/projects/components/createProjectDialog";
import { ProjectService } from "~/modules/projects/project";
import type { User } from "~/modules/users/users.types";
import TeamAuthorization from "../authorization";
import TeamProjects from "../components/teamProjects";
import type { Team } from "../teams.types";
import type { Route } from "./+types/teamProjects.route";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireAuth({ request });
  if (!TeamAuthorization.canView(user, params.teamId)) {
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
    filterableFields: [],
  });

  const projects = await ProjectService.paginate(query);

  return { projects };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { intent, payload = {} } = await request.json();
  const { name } = payload;

  const user = await requireAuth({ request });

  if (!ProjectAuthorization.canCreate(user, params.teamId)) {
    throw new Error(
      "You do not have permission to create a project in this team.",
    );
  }

  if (intent === "CREATE_PROJECT") {
    if (typeof name !== "string")
      throw new Error("Project name is required and must be a string.");
    const project = await ProjectService.create({
      name,
      team: params.teamId,
      createdBy: user._id,
    });
    return {
      intent: "CREATE_PROJECT",
      data: project,
    };
  }

  return {};
}

export default function TeamProjectsRoute() {
  const data = useLoaderData<typeof loader>();
  const params = useParams();
  const ctx = useOutletContext<{ team: Team }>();
  const navigate = useNavigate();
  const user = useContext(AuthenticationContext) as User;
  const teamId = params.teamId;

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

  const onCreateProjectButtonClicked = () => {
    addDialog(
      <CreateProjectDialog
        hasTeamSelection={false}
        teamId={teamId}
        onProjectCreated={(project) => {
          navigate(`/projects/${project._id}`);
        }}
      />,
    );
  };

  const onActionClicked = (action: string) => {
    if (action === "CREATE") {
      onCreateProjectButtonClicked();
    }
  };

  const onItemActionClicked = ({
    id,
    action: _action,
  }: {
    id: string;
    action: string;
  }) => {
    const project = find(data.projects.data, { _id: id });
    if (!project) return null;
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

  const projects = data.projects.data ?? [];

  return (
    <TeamProjects
      projects={projects}
      team={ctx.team}
      user={user}
      searchValue={searchValue}
      currentPage={currentPage}
      totalPages={data.projects.totalPages}
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
