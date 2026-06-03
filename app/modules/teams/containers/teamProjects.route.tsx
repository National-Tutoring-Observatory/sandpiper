import escapeRegExp from "lodash/escapeRegExp";
import find from "lodash/find";
import { useContext, useEffect } from "react";
import {
  data,
  redirect,
  useLoaderData,
  useNavigate,
  useOutletContext,
  useParams,
  useSearchParams,
} from "react-router";
import buildQueryFromParams from "~/modules/app/helpers/buildQueryFromParams";
import getQueryParamsFromRequest from "~/modules/app/helpers/getQueryParamsFromRequest.server";
import { useSearchQueryParams } from "~/modules/app/hooks/useSearchQueryParams";
import { AuthenticationContext } from "~/modules/authentication/authentication.context";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import addDialog from "~/modules/dialogs/addDialog";
import ProjectAuthorization from "~/modules/projects/authorization";
import CreateProjectDialog from "~/modules/projects/components/createProjectDialog";
import {
  PROJECTS_CREATE_PARAM,
  projectUrl,
} from "~/modules/projects/helpers/projectUrls";
import { useProjectActions } from "~/modules/projects/hooks/useProjectActions";
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
  const user = await requireAuth({ request });

  if (!ProjectAuthorization.canCreate(user, params.teamId)) {
    return data(
      {
        errors: {
          general: "You do not have permission to create projects in this team",
        },
      },
      { status: 403 },
    );
  }

  const { intent, payload = {} } = await request.json();
  const { name } = payload;

  if (intent !== "CREATE_PROJECT") {
    return data({ errors: { general: "Invalid intent" } }, { status: 400 });
  }

  if (typeof name !== "string" || !name.trim()) {
    return data(
      { errors: { general: "Project name is required" } },
      { status: 400 },
    );
  }

  const existingProject = await ProjectService.findOne({
    name: { $regex: new RegExp(`^${escapeRegExp(name.trim())}$`, "i") },
    team: params.teamId,
  });
  if (existingProject) {
    return data(
      { errors: { general: "A project with this name already exists" } },
      { status: 409 },
    );
  }

  const project = await ProjectService.create({
    name: name.trim(),
    team: params.teamId,
    createdBy: user._id,
  });
  return data({ success: true, intent: "CREATE_PROJECT", data: project });
}

export default function TeamProjectsRoute() {
  const data = useLoaderData<typeof loader>();
  const params = useParams();
  const ctx = useOutletContext<{ team: Team }>();
  const navigate = useNavigate();
  const user = useContext(AuthenticationContext) as User;
  const teamId = params.teamId;

  const { openEditProjectDialog, openDeleteProjectDialog } =
    useProjectActions();
  const [searchParams, setSearchParams] = useSearchParams();

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
        teamId={teamId!}
        onProjectCreated={(project) => {
          navigate(projectUrl(teamId!, project._id));
        }}
      />,
    );
  };

  useEffect(() => {
    if (searchParams.get(PROJECTS_CREATE_PARAM) !== "1") return;
    onCreateProjectButtonClicked();
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete(PROJECTS_CREATE_PARAM);
        return next;
      },
      { replace: true },
    );
  }, [searchParams, setSearchParams]);

  const onActionClicked = (action: string) => {
    if (action === "CREATE") {
      onCreateProjectButtonClicked();
    }
  };

  const onItemActionClicked = ({
    id,
    action,
  }: {
    id: string;
    action: string;
  }) => {
    const project = find(data.projects.data, { _id: id });
    if (!project) return null;
    switch (action) {
      case "EDIT":
        openEditProjectDialog(project);
        break;
      case "DELETE":
        openDeleteProjectDialog(project);
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
