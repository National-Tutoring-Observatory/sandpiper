import has from "lodash/has";
import map from "lodash/map";
import throttle from "lodash/throttle";
import { useEffect, useState } from "react";
import {
  redirect,
  useLoaderData,
  useNavigate,
  useRevalidator,
  useSubmit,
} from "react-router";
import getQueryParamsFromRequest from "~/modules/app/helpers/getQueryParamsFromRequest.server";
import triggerDownload from "~/modules/app/helpers/triggerDownload";
import useHandleSockets from "~/modules/app/hooks/useHandleSockets";
import { useSearchQueryParams } from "~/modules/app/hooks/useSearchQueryParams";
import getSessionUserTeams from "~/modules/authentication/helpers/getSessionUserTeams";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import addDialog from "~/modules/dialogs/addDialog";
import ProjectAuthorization from "~/modules/projects/authorization";
import { ProjectService } from "~/modules/projects/project";
import exportRun from "~/modules/runs/helpers/exportRun";
import { useCreateRunSetForRun } from "~/modules/runs/hooks/useCreateRunSetForRun";
import { useRunActions } from "~/modules/runs/hooks/useRunActions";
import { RunService } from "~/modules/runs/run";
import type { Run, RunSession } from "~/modules/runs/runs.types";
import { RunSetService } from "~/modules/runSets/runSet";
import RunDetail from "../components/run";
import StopRunDialog from "../components/stopRunDialog";
import type { Route } from "./+types/run.route";

interface PromptInfo {
  name: string;
  version: number;
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const authenticationTeams = await getSessionUserTeams({ request });
  const teamIds = map(authenticationTeams, "team");
  const project = await ProjectService.findOne({
    _id: params.projectId,
    team: { $in: teamIds },
  });
  if (!project) {
    return redirect("/");
  }
  const run = await RunService.findOne({
    _id: params.runId,
    project: params.projectId,
  });
  if (!run) {
    return redirect("/");
  }

  const promptInfo: PromptInfo = {
    name: run.snapshot.prompt.name,
    version: run.snapshot.prompt.version,
  };

  const runSetId = params.runSetId;
  const runSet = runSetId
    ? await RunSetService.findOne({ _id: runSetId, project: params.projectId })
    : null;

  const runRunSets = await RunSetService.paginate({
    match: { runs: params.runId },
    page: 1,
    pageSize: 4,
  });

  const sessionsQueryParams = getQueryParamsFromRequest(
    request,
    {
      searchValue: "",
      currentPage: 1,
      sort: "name",
      filters: {},
    },
    { paramPrefix: "sessions" },
  );

  const paginatedSessions = RunService.paginateSessions(run.sessions, {
    searchValue: sessionsQueryParams.searchValue,
    sort: sessionsQueryParams.sort,
    page: sessionsQueryParams.currentPage,
    filters: sessionsQueryParams.filters,
  });

  return {
    project,
    run,
    promptInfo,
    runSet,
    runRunSets: runRunSets.data,
    runRunSetsCount: runRunSets.count,
    paginatedSessions,
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireAuth({ request });

  const project = await ProjectService.findById(params.projectId);
  if (!project || !ProjectAuthorization.Runs.canManage(user, project)) {
    return redirect("/");
  }

  const { intent, payload = {} } = await request.json();

  const { exportType } = payload;

  const run = await RunService.findOne({
    _id: params.runId,
    project: params.projectId,
  });
  if (!run) throw new Error("Run not found");

  switch (intent) {
    case "STOP_RUN": {
      if (run.isComplete || run.stoppedAt) throw new Error("Run is not active");
      await RunService.stop(run._id);
      return {};
    }
    case "RE_RUN": {
      await RunService.start(run, undefined, user._id);
      return {};
    }
    case "EXPORT_RUN": {
      if (!run.isComplete)
        throw new Error("Cannot export a run that is not complete");
      if (run.hasErrored)
        throw new Error("Cannot export a run that has errors");
      await exportRun({ runId: params.runId, exportType });
      return {};
    }
    case "GET_ALL_RUN_SETS": {
      const allRunSets = await RunSetService.paginate({
        match: { runs: params.runId },
        page: 1,
        pageSize: 100,
      });
      return { runSets: allRunSets.data };
    }
    case "UPDATE_RUN": {
      if (typeof payload.name !== "string") {
        throw new Error("Run name is required and must be a string.");
      }
      await RunService.updateById(run._id, { name: payload.name });
      return { success: true, intent: "UPDATE_RUN" };
    }
    case "DELETE_RUN": {
      await RunService.deleteById(run._id);
      return { success: true, intent: "DELETE_RUN" };
    }
    default:
      return {};
  }
}

const debounceRevalidate = throttle((revalidate) => {
  revalidate();
}, 2000);

export default function ProjectRunRoute() {
  const {
    project,
    run,
    promptInfo,
    runSet,
    runRunSets,
    runRunSetsCount,
    paginatedSessions,
  } = useLoaderData<typeof loader>();
  const initialDoneCount = run.sessions.filter(
    (s: RunSession) => s.status === "DONE",
  ).length;
  const [runSessionsProgress, setRunSessionsProgress] = useState(
    run.sessions.length
      ? Math.round((100 / run.sessions.length) * initialDoneCount)
      : 0,
  );
  const [runSessionsStep, setRunSessionsStep] = useState(
    run.isRunning && run.sessions.length
      ? `${initialDoneCount}/${run.sessions.length}`
      : "",
  );

  const {
    searchValue: sessionsSearchValue,
    setSearchValue: setSessionsSearchValue,
    currentPage: sessionsCurrentPage,
    setCurrentPage: setSessionsCurrentPage,
    sortValue: sessionsSortValue,
    setSortValue: setSessionsSortValue,
    filtersValues: sessionsFiltersValues,
    setFiltersValues: setSessionsFiltersValues,
    isSyncing: isSessionsSyncing,
  } = useSearchQueryParams(
    {
      searchValue: "",
      currentPage: 1,
      sortValue: "name",
      filters: {},
    },
    { paramPrefix: "sessions" },
  );
  const [isSubmittingExport, setIsSubmittingExport] = useState(false);
  const submit = useSubmit();
  const navigate = useNavigate();
  const { revalidate } = useRevalidator();
  const { openEditRunDialog, openDeleteRunDialog } = useRunActions({
    projectId: project._id,
    onDeleteSuccess: () => {
      if (runSet?._id) {
        navigate(`/projects/${project._id}/run-sets/${runSet._id}`);
      } else {
        navigate(`/projects/${project._id}`);
      }
    },
  });

  const onExportRunButtonClicked = ({ exportType }: { exportType: string }) => {
    setIsSubmittingExport(true);
    submit(
      JSON.stringify({
        intent: "EXPORT_RUN",
        payload: {
          exportType,
        },
      }),
      { method: "POST", encType: "application/json" },
    );
  };

  const openStopRunDialog = () => {
    addDialog(
      <StopRunDialog
        onStopRunClicked={() => {
          submit(JSON.stringify({ intent: "STOP_RUN", payload: {} }), {
            method: "POST",
            encType: "application/json",
          });
        }}
      />,
    );
  };

  const onReRunClicked = () => {
    submit(
      JSON.stringify({
        intent: "RE_RUN",
        payload: {},
      }),
      { method: "POST", encType: "application/json" },
    );
  };

  const { openCreateRunSetDialog } = useCreateRunSetForRun({
    projectId: project._id,
  });

  const onDuplicateRunButtonClicked = (run: Run) => {
    navigate(`/projects/${project._id}/create-run?duplicateFrom=${run._id}`);
  };

  const onAddToExistingRunSetClicked = (run: Run) => {
    navigate(`/projects/${project._id}/runs/${run._id}/add-to-run-set`);
  };

  const onUseAsTemplateClicked = (run: Run) => {
    navigate(`/projects/${project._id}/create-run-set?fromRun=${run._id}`);
  };

  useHandleSockets({
    event: "ANNOTATE_RUN",
    matches: [
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
    ],
    callback: (payload) => {
      if (has(payload, "progress")) {
        setRunSessionsProgress(payload.progress);
      }
      if (has(payload, "step")) {
        setRunSessionsStep(payload.step);
      }
      debounceRevalidate(revalidate);
    },
  });

  useHandleSockets({
    event: "EXPORT_RUN",
    matches: [
      {
        runId: run._id,
        task: "EXPORT_RUN:START",
        status: "FINISHED",
      },
      {
        runId: run._id,
        task: "EXPORT_RUN:FINISH",
        status: "FINISHED",
      },
    ],
    callback: (payload) => {
      setIsSubmittingExport(false);
      debounceRevalidate(revalidate);
      if (payload.downloadUrl && !payload.hasErrored) {
        triggerDownload(payload.downloadUrl);
      }
    },
  });

  useEffect(() => {
    const eventSource = new EventSource("/api/events");

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.runId === run._id) {
        switch (data.event) {
          case "ANNOTATE_RUN_SESSION":
            setRunSessionsProgress(data.progress);
            if (data.step) {
              setRunSessionsStep(data.step);
            }
            debounceRevalidate(revalidate);
            break;
        }
      }
    };
    return () => {
      eventSource.close();
    };
  }, []);

  const parentBreadcrumbs = runSet
    ? [
        { text: "Run Sets", link: `/projects/${project._id}/run-sets` },
        {
          text: runSet.name,
          link: `/projects/${project._id}/run-sets/${runSet._id}`,
        },
      ]
    : [{ text: "Runs", link: `/projects/${project._id}` }];

  const breadcrumbs = [
    { text: "Projects", link: `/` },
    { text: project.name, link: `/projects/${project._id}` },
    ...parentBreadcrumbs,
    { text: run.name },
  ];

  return (
    <RunDetail
      run={run}
      isExporting={isSubmittingExport || run.isExporting || false}
      promptInfo={promptInfo}
      runSets={runRunSets || []}
      runSetsCount={runRunSetsCount || 0}
      runSessionsProgress={runSessionsProgress}
      runSessionsStep={runSessionsStep}
      breadcrumbs={breadcrumbs}
      onExportRunButtonClicked={onExportRunButtonClicked}
      onStopRunClicked={openStopRunDialog}
      onReRunClicked={onReRunClicked}
      onDuplicateRunButtonClicked={onDuplicateRunButtonClicked}
      onEditRunButtonClicked={openEditRunDialog}
      onDeleteRunButtonClicked={openDeleteRunDialog}
      onAddToExistingRunSetClicked={onAddToExistingRunSetClicked}
      onAddToNewRunSetClicked={() => openCreateRunSetDialog(run._id)}
      onUseAsTemplateClicked={onUseAsTemplateClicked}
      runSetId={runSet?._id}
      sessions={paginatedSessions?.data || []}
      sessionsTotalPages={paginatedSessions?.totalPages || 1}
      sessionsSearchValue={sessionsSearchValue}
      sessionsCurrentPage={sessionsCurrentPage}
      sessionsSortValue={sessionsSortValue}
      sessionsFiltersValues={sessionsFiltersValues}
      isSessionsSyncing={isSessionsSyncing}
      onSessionsSearchValueChanged={setSessionsSearchValue}
      onSessionsCurrentPageChanged={setSessionsCurrentPage}
      onSessionsSortValueChanged={setSessionsSortValue}
      onSessionsFiltersValueChanged={setSessionsFiltersValues}
    />
  );
}
