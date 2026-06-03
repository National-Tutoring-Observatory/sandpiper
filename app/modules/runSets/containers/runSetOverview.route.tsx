import find from "lodash/find";
import throttle from "lodash/throttle";
import {
  data,
  redirect,
  useLoaderData,
  useNavigate,
  useOutletContext,
  useRevalidator,
  useSubmit,
} from "react-router";
import buildQueryFromParams from "~/modules/app/helpers/buildQueryFromParams";
import getQueryParamsFromRequest from "~/modules/app/helpers/getQueryParamsFromRequest.server";
import triggerDownload from "~/modules/app/helpers/triggerDownload";
import useHandleSockets from "~/modules/app/hooks/useHandleSockets";
import { useSearchQueryParams } from "~/modules/app/hooks/useSearchQueryParams";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import addDialog from "~/modules/dialogs/addDialog";
import ProjectAuthorization from "~/modules/projects/authorization";
import {
  projectRunSetUrl,
  projectRunSetsUrl,
} from "~/modules/projects/helpers/projectUrls";
import { ProjectService } from "~/modules/projects/project";
import buildRunStatusMatch from "~/modules/runs/helpers/buildRunStatusMatch";
import { RunService } from "~/modules/runs/run";
import type { Run } from "~/modules/runs/runs.types";
import RemoveRunFromRunSetDialog from "~/modules/runSets/components/removeRunFromRunSetDialog";
import RunSetOverview from "~/modules/runSets/components/runSetOverview";
import { RunSetService } from "~/modules/runSets/runSet";
import type { RunSet } from "~/modules/runSets/runSets.types";
import ViewSessionContainer from "~/modules/sessions/containers/viewSessionContainer";
import { SessionService } from "~/modules/sessions/session";
import type { Route } from "./+types/runSetOverview.route";

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

  const runSet = await RunSetService.findOne({
    _id: params.runSetId,
    project: params.projectId,
  });
  if (!runSet) {
    return redirect(projectRunSetsUrl(params.teamId, params.projectId));
  }

  const runsQueryParams = getQueryParamsFromRequest(
    request,
    {
      searchValue: "",
      currentPage: 1,
      sort: "-createdAt",
      filters: {},
    },
    { paramPrefix: "runs" },
  );

  const runsQuery = buildQueryFromParams({
    match: { _id: { $in: runSet.runs || [] } },
    queryParams: runsQueryParams,
    searchableFields: ["name"],
    sortableFields: ["name", "createdAt"],
    filterableFields: [{ status: buildRunStatusMatch }],
  });

  const runs = await RunService.paginate({
    match: runsQuery.match,
    sort: runsQuery.sort,
    page: runsQuery.page,
  });

  const sessionsQueryParams = getQueryParamsFromRequest(
    request,
    {
      searchValue: "",
      currentPage: 1,
      sort: "-createdAt",
      filters: {},
    },
    { paramPrefix: "sessions" },
  );

  const sessionsQuery = buildQueryFromParams({
    match: { _id: { $in: runSet.sessions || [] } },
    queryParams: sessionsQueryParams,
    searchableFields: ["name"],
    sortableFields: ["name", "createdAt"],
  });

  const sessions = await SessionService.paginate({
    match: sessionsQuery.match,
    sort: sessionsQuery.sort,
    page: sessionsQuery.page,
  });

  return {
    runs,
    sessions,
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireAuth({ request });

  const project = await ProjectService.findOne({
    _id: params.projectId,
    team: params.teamId,
  });
  if (!project) {
    return data({ errors: { project: "Project not found" } }, { status: 404 });
  }

  if (!ProjectAuthorization.Runs.canManage(user, project)) {
    return data({ errors: { project: "Access denied" } }, { status: 403 });
  }

  const { intent, payload = {} } = await request.json();

  switch (intent) {
    case "REMOVE_RUN_FROM_RUN_SET": {
      const { runId } = payload;
      const runSet = await RunSetService.findOne({
        _id: params.runSetId,
        project: params.projectId,
      });
      if (!runSet) {
        return data(
          { errors: { runSet: "Run set not found" } },
          { status: 404 },
        );
      }
      await RunSetService.removeRunFromRunSet(runSet._id, runId);
      return { intent: "REMOVE_RUN_FROM_RUN_SET" };
    }
    default: {
      return data({ errors: { intent: "Invalid intent" } }, { status: 400 });
    }
  }
}

export default function RunSetOverviewRoute({ params }: Route.ComponentProps) {
  const { runs, sessions } = useLoaderData<typeof loader>();
  const { runSet, project } = useOutletContext<{
    runSet: RunSet;
    project: { _id: string; name: string };
  }>();
  const revalidator = useRevalidator();
  const navigate = useNavigate();
  const submit = useSubmit();
  const {
    searchValue: runsSearchValue,
    setSearchValue: setRunsSearchValue,
    currentPage: runsCurrentPage,
    setCurrentPage: setRunsCurrentPage,
    sortValue: runsSortValue,
    setSortValue: setRunsSortValue,
    filtersValues: runsFiltersValues,
    setFiltersValues: setRunsFiltersValues,
    isSyncing: isRunsSyncing,
  } = useSearchQueryParams(
    {
      searchValue: "",
      currentPage: 1,
      sortValue: "-createdAt",
      filters: {},
    },
    { paramPrefix: "runs" },
  );

  const {
    searchValue: sessionsSearchValue,
    setSearchValue: setSessionsSearchValue,
    currentPage: sessionsCurrentPage,
    setCurrentPage: setSessionsCurrentPage,
    sortValue: sessionsSortValue,
    setSortValue: setSessionsSortValue,
    isSyncing: isSessionsSyncing,
  } = useSearchQueryParams(
    {
      searchValue: "",
      currentPage: 1,
      sortValue: "-createdAt",
      filters: {},
    },
    { paramPrefix: "sessions" },
  );

  const debounceRevalidate = throttle(() => {
    revalidator.revalidate();
  }, 500);

  const onSessionItemClicked = (id: string) => {
    const session = find(sessions.data, { _id: id });
    if (!session) return;
    addDialog(<ViewSessionContainer session={session} />);
  };

  const submitRemoveRunFromRunSet = (runId: string) => {
    submit(
      JSON.stringify({
        intent: "REMOVE_RUN_FROM_RUN_SET",
        payload: { runId },
      }),
      { method: "POST", encType: "application/json" },
    );
  };

  const openRemoveRunDialog = (run: Run) => {
    addDialog(
      <RemoveRunFromRunSetDialog
        run={run}
        onRemoveRunClicked={submitRemoveRunFromRunSet}
      />,
    );
  };

  const onRunActionClicked = ({
    id,
    action,
  }: {
    id: string;
    action: string;
  }) => {
    if (action === "REMOVE_FROM_RUN_SET") {
      const run = find(runs.data, { _id: id });
      if (run) {
        openRemoveRunDialog(run);
      }
    }
  };

  useHandleSockets({
    event: "ANNOTATE_RUN",
    matches: runs.data
      .map((run) => [
        {
          runId: run._id,
          task: "ANNOTATE_RUN:START",
          status: "FINISHED",
        },
        {
          runId: run._id,
          task: "ANNOTATE_RUN:PROCESS",
          status: "STARTED",
        },
        {
          runId: run._id,
          task: "ANNOTATE_RUN:PROCESS",
          status: "FINISHED",
        },
        {
          runId: run._id,
          task: "ANNOTATE_RUN:FINISH",
          status: "FINISHED",
        },
      ])
      .flat(),
    callback: () => {
      debounceRevalidate();
    },
  });

  useHandleSockets({
    event: "EXPORT_RUN_SET",
    matches: [
      {
        runSetId: runSet._id,
        task: "EXPORT_RUN_SET:FINISH",
        status: "FINISHED",
      },
    ],
    callback: (payload: { downloadUrl?: string; hasErrored?: boolean }) => {
      debounceRevalidate();
      if (payload.downloadUrl && !payload.hasErrored) {
        triggerDownload(payload.downloadUrl);
      }
    },
  });

  return (
    <RunSetOverview
      teamId={params.teamId}
      runSet={runSet}
      runs={runs.data}
      runsTotalPages={runs.totalPages}
      runsCurrentPage={runsCurrentPage}
      runsSearchValue={runsSearchValue}
      runsSortValue={runsSortValue}
      isRunsSyncing={isRunsSyncing}
      sessions={sessions.data}
      sessionsTotalPages={sessions.totalPages}
      sessionsCurrentPage={sessionsCurrentPage}
      sessionsSearchValue={sessionsSearchValue}
      sessionsSortValue={sessionsSortValue}
      isSessionsSyncing={isSessionsSyncing}
      onSessionItemClicked={onSessionItemClicked}
      onRunsSearchValueChanged={setRunsSearchValue}
      onRunsCurrentPageChanged={setRunsCurrentPage}
      runsFiltersValues={runsFiltersValues}
      onRunsFiltersValueChanged={(filterValue: Record<string, string | null>) =>
        setRunsFiltersValues({ ...runsFiltersValues, ...filterValue })
      }
      onRunsSortValueChanged={setRunsSortValue}
      onSessionsSearchValueChanged={setSessionsSearchValue}
      onSessionsCurrentPageChanged={setSessionsCurrentPage}
      onSessionsSortValueChanged={setSessionsSortValue}
      onCreateRunsClicked={() =>
        navigate(
          `${projectRunSetUrl(params.teamId, project._id, runSet._id)}/create-runs`,
        )
      }
      onRunActionClicked={onRunActionClicked}
    />
  );
}
