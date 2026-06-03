import { data, redirect, useNavigate } from "react-router";
import buildQueryFromParams from "~/modules/app/helpers/buildQueryFromParams";
import getQueryParamsFromRequest from "~/modules/app/helpers/getQueryParamsFromRequest.server";
import { useSearchQueryParams } from "~/modules/app/hooks/useSearchQueryParams";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import ProjectAuthorization from "~/modules/projects/authorization";
import { projectCreateRunSetUrl } from "~/modules/projects/helpers/projectUrls";
import { ProjectService } from "~/modules/projects/project";
import { useRunSetActions } from "~/modules/runSets/hooks/useRunSetActions";
import { RunSetService } from "~/modules/runSets/runSet";
import type { RunSet } from "~/modules/runSets/runSets.types";
import RunSetsList from "../components/runSetsList";
import type { Route } from "./+types/runSetsList.route";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireAuth({ request });

  const project = await ProjectService.findOne({
    _id: params.projectId,
    team: params.teamId,
  });
  if (!project) {
    return redirect("/");
  }

  if (!ProjectAuthorization.canView(user, project)) {
    return redirect("/");
  }

  const queryParams = getQueryParamsFromRequest(request, {
    searchValue: "",
    currentPage: 1,
    sort: "-createdAt",
    filters: {},
  });

  const query = buildQueryFromParams({
    match: { project: params.projectId },
    queryParams,
    searchableFields: ["name"],
    sortableFields: ["name", "createdAt"],
  });

  const runSets = await RunSetService.paginate(query);

  return { runSets, project };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireAuth({ request });

  const project = await ProjectService.findOne({
    _id: params.projectId,
    team: params.teamId,
  });
  if (!project) {
    throw new Error("Project not found");
  }

  if (!ProjectAuthorization.Runs.canManage(user, project)) {
    return data({ errors: { project: "Access denied" } }, { status: 403 });
  }

  const body = await request.json();
  const { intent, entityId, payload = {} } = body;

  const { name, annotationType } = payload;
  let runSet;

  switch (intent) {
    case "CREATE_RUN_SET": {
      if (typeof name !== "string") {
        throw new Error("Run set name is required and must be a string.");
      }
      if (typeof annotationType !== "string") {
        throw new Error("Annotation type is required and must be a string.");
      }
      runSet = await RunSetService.create({
        project: params.projectId,
        name,
        sessions: [],
        runs: [],
        hasSetup: false,
        annotationType,
      });
      return {
        intent: "CREATE_RUN_SET",
        ...runSet,
      };
    }
    case "UPDATE_RUN_SET": {
      if (typeof name !== "string") {
        throw new Error("Run set name is required and must be a string.");
      }
      const runSetToUpdate = await RunSetService.findOne({
        _id: entityId,
        project: params.projectId,
      });
      if (!runSetToUpdate) {
        return data(
          { errors: { runSet: "Run set not found" } },
          { status: 404 },
        );
      }
      await RunSetService.updateById(entityId, {
        name,
      });
      return {};
    }
    case "DUPLICATE_RUN_SET": {
      if (typeof name !== "string") {
        throw new Error("Run set name is required and must be a string.");
      }
      const existingRunSet = await RunSetService.findOne({
        _id: entityId,
        project: params.projectId,
      });

      if (!existingRunSet) {
        throw new Error("Run set not found");
      }

      runSet = await RunSetService.create({
        project: existingRunSet.project,
        name: name,
        sessions: existingRunSet.sessions,
        runs: existingRunSet.runs || [],
        hasSetup: true,
        annotationType: existingRunSet.annotationType,
      });
      return {
        intent: "DUPLICATE_RUN_SET",
        ...runSet,
      };
    }
    case "DELETE_RUN_SET": {
      const runSetToDelete = await RunSetService.findOne({
        _id: entityId,
        project: params.projectId,
      });
      if (!runSetToDelete) {
        return data(
          { errors: { runSet: "Run set not found" } },
          { status: 404 },
        );
      }
      await RunSetService.deleteWithCleanup(entityId);

      return {
        intent: "DELETE_RUN_SET",
      };
    }
    default: {
      return {};
    }
  }
}

export default function RunSetsListRoute({
  loaderData,
  params,
}: Route.ComponentProps) {
  const { runSets, project } = loaderData;
  const navigate = useNavigate();

  const {
    openEditRunSetDialog,
    openDeleteRunSetDialog,
    openDuplicateRunSetDialog,
  } = useRunSetActions({
    teamId: params.teamId,
    projectId: project._id,
  });

  const {
    searchValue,
    setSearchValue,
    currentPage,
    setCurrentPage,
    sortValue,
    setSortValue,
    isSyncing,
  } = useSearchQueryParams({
    searchValue: "",
    currentPage: 1,
    sortValue: "createdAt",
  });

  const onSearchValueChanged = (searchValue: string) => {
    setSearchValue(searchValue);
  };

  const onPaginationChanged = (currentPage: number) => {
    setCurrentPage(currentPage);
  };

  const onSortValueChanged = (sortValue: string) => {
    setSortValue(sortValue);
  };

  const onCreateRunSetButtonClicked = () => {
    navigate(projectCreateRunSetUrl(params.teamId, project._id));
  };

  const onUseAsTemplateButtonClicked = (runSet: RunSet) => {
    navigate(
      `${projectCreateRunSetUrl(params.teamId, project._id)}?fromRunSet=${runSet._id}`,
    );
  };

  return (
    <RunSetsList
      teamId={params.teamId}
      runSets={runSets?.data}
      totalPages={runSets.totalPages}
      searchValue={searchValue}
      currentPage={currentPage}
      sortValue={sortValue}
      isSyncing={isSyncing}
      onCreateRunSetButtonClicked={onCreateRunSetButtonClicked}
      onEditRunSetButtonClicked={openEditRunSetDialog}
      onDuplicateRunSetButtonClicked={openDuplicateRunSetDialog}
      onUseAsTemplateButtonClicked={onUseAsTemplateButtonClicked}
      onDeleteRunSetButtonClicked={openDeleteRunSetDialog}
      onSearchValueChanged={onSearchValueChanged}
      onPaginationChanged={onPaginationChanged}
      onSortValueChanged={onSortValueChanged}
    />
  );
}
