import throttle from "lodash/throttle";
import { useState } from "react";
import {
  data,
  redirect,
  useLoaderData,
  useLocation,
  useNavigate,
  useRevalidator,
  useSubmit,
} from "react-router";
import type { Breadcrumb } from "~/modules/app/app.types";
import triggerDownload from "~/modules/app/helpers/triggerDownload";
import useHandleSockets from "~/modules/app/hooks/useHandleSockets";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import addDialog from "~/modules/dialogs/addDialog";
import DownloadAnnotationTemplateDialog from "~/modules/humanAnnotations/components/downloadAnnotationTemplateDialog";
import getAnnotationFieldsFromRuns from "~/modules/humanAnnotations/helpers/getAnnotationFieldsFromRuns";
import { useUploadHumanAnnotations } from "~/modules/humanAnnotations/hooks/useUploadHumanAnnotations";
import type { AnnotationTemplateConfig } from "~/modules/humanAnnotations/humanAnnotations.types";
import ProjectAuthorization from "~/modules/projects/authorization";
import {
  projectCreateRunSetUrl,
  projectRunSetUrl,
  projectRunSetsUrl,
  projectUrl,
  projectsUrl,
} from "~/modules/projects/helpers/projectUrls";
import { ProjectService } from "~/modules/projects/project";
import { RunService } from "~/modules/runs/run";
import RunSetDetail from "~/modules/runSets/components/runSetDetail";
import StopRunSetDialog from "~/modules/runSets/components/stopRunSetDialog";
import exportRunSet from "~/modules/runSets/helpers/exportRunSet";
import { useRunSetActions } from "~/modules/runSets/hooks/useRunSetActions";
import { RunSetService } from "~/modules/runSets/runSet";
import type { Route } from "./+types/runSetDetail.route";

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

  const runIds = runSet.runs ?? [];
  let annotationProgress = {
    totalRuns: runIds.length,
    completedRuns: 0,
    erroredRuns: 0,
    totalSessions: 0,
    completedSessions: 0,
    processing: 0,
    startedAt: null as string | null,
  };

  if (runIds.length > 0) {
    const progress = await RunService.aggregateProgress(runIds);
    annotationProgress = {
      totalRuns: runIds.length,
      ...progress,
    };
  }

  const runs = runIds.length
    ? await RunService.find({
        match: { _id: { $in: runIds } },
        select: "snapshot.prompt.annotationSchema",
      })
    : [];
  const availableAnnotationFields = getAnnotationFieldsFromRuns(runs);

  return {
    runSet,
    project,
    annotationProgress,
    availableAnnotationFields,
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
    case "STOP_ALL_RUNS": {
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
      await RunSetService.stopAllRuns(runSet._id);
      return { intent: "STOP_ALL_RUNS" };
    }
    case "EXPORT_RUN_SET": {
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

      const runIds = runSet.runs ?? [];
      if (runIds.length > 0) {
        const runs = await RunService.find({
          match: { _id: { $in: runIds } },
        });
        const allComplete = runs.every((r) => r.isComplete && !r.hasErrored);
        if (!allComplete) {
          return data(
            {
              errors: { general: "All runs must be complete before exporting" },
            },
            { status: 400 },
          );
        }
      }

      const { exportType } = payload;
      await exportRunSet({ runSetId: params.runSetId, exportType });
      return {};
    }
    default: {
      return data({ errors: { intent: "Invalid intent" } }, { status: 400 });
    }
  }
}

const debounceRevalidate = throttle((revalidate) => {
  revalidate();
}, 500);

export default function RunSetDetailRoute({ params }: Route.ComponentProps) {
  const { runSet, project, annotationProgress, availableAnnotationFields } =
    useLoaderData<typeof loader>();
  const runIds = runSet.runs ?? [];
  const [isSubmittingExport, setIsSubmittingExport] = useState(false);
  const submit = useSubmit();
  const navigate = useNavigate();
  const location = useLocation();
  const { revalidate } = useRevalidator();

  const parts = location.pathname.split("/").filter(Boolean);
  const last = parts[parts.length - 1];
  const activeView = last === "evaluations" ? "evaluations" : "overview";

  const onActiveViewChange = (value: string) => {
    const basePath = projectRunSetUrl(params.teamId, project._id, runSet._id);
    if (value === "overview") {
      navigate(basePath);
    } else {
      navigate(`${basePath}/${value}`);
    }
  };

  const {
    openEditRunSetDialog,
    openDeleteRunSetDialog,
    openDuplicateRunSetDialog,
  } = useRunSetActions({
    teamId: params.teamId,
    projectId: project._id,
    onDeleteSuccess: () => {
      navigate(projectRunSetsUrl(params.teamId, project._id));
    },
  });

  const { openUploadHumanAnnotationsDialog } = useUploadHumanAnnotations({
    runSetId: runSet._id,
  });

  const openDownloadAnnotationTemplateDialog = () => {
    const submitDownload = (config: AnnotationTemplateConfig) => {
      const configBase64 = btoa(JSON.stringify(config));
      const url = `/api/downloadAnnotationTemplate/${runSet._id}?config=${encodeURIComponent(configBase64)}`;
      triggerDownload(url);
      addDialog(null);
    };

    addDialog(
      <DownloadAnnotationTemplateDialog
        availableFields={availableAnnotationFields}
        onDownloadClicked={submitDownload}
      />,
    );
  };

  const submitStopAllRuns = () => {
    submit(JSON.stringify({ intent: "STOP_ALL_RUNS", payload: {} }), {
      method: "POST",
      encType: "application/json",
    });
  };

  const openStopRunSetDialog = () => {
    addDialog(<StopRunSetDialog onStopRunSetClicked={submitStopAllRuns} />);
  };

  const onExportRunSetButtonClicked = ({
    exportType,
  }: {
    exportType: string;
  }) => {
    setIsSubmittingExport(true);
    submit(
      JSON.stringify({
        intent: "EXPORT_RUN_SET",
        payload: {
          exportType,
        },
      }),
      { method: "POST", encType: "application/json" },
    );
  };

  useHandleSockets({
    event: "ANNOTATE_RUN",
    matches: runIds
      .map((runId) => [
        {
          runId,
          task: "ANNOTATE_RUN:START",
          status: "FINISHED",
        },
        {
          runId,
          task: "ANNOTATE_RUN:PROCESS",
          status: "FINISHED",
        },
        {
          runId,
          task: "ANNOTATE_RUN:FINISH",
          status: "FINISHED",
        },
      ])
      .flat(),
    callback: () => {
      debounceRevalidate(revalidate);
    },
  });

  useHandleSockets({
    event: "UPLOAD_HUMAN_ANNOTATIONS",
    matches: runIds
      .map((runId) => [
        {
          runId,
          task: "UPLOAD_HUMAN_ANNOTATIONS:PROCESS",
          status: "FINISHED",
        },
        {
          runId,
          task: "UPLOAD_HUMAN_ANNOTATIONS:FINISH",
          status: "FINISHED",
        },
      ])
      .flat(),
    callback: () => {
      debounceRevalidate(revalidate);
    },
  });

  useHandleSockets({
    event: "EXPORT_RUN_SET",
    matches: [
      {
        runSetId: runSet._id,
        task: "EXPORT_RUN_SET:START",
        status: "FINISHED",
      },
      {
        runSetId: runSet._id,
        task: "EXPORT_RUN_SET:FINISH",
        status: "FINISHED",
      },
    ],
    callback: () => {
      setIsSubmittingExport(false);
      debounceRevalidate(revalidate);
    },
  });

  const breadcrumbs = [
    { text: "Projects", link: projectsUrl(params.teamId) },
    { text: project.name, link: projectUrl(params.teamId, project._id) },
    {
      text: "Run Sets",
      link: projectRunSetsUrl(params.teamId, project._id),
    },
  ] as Breadcrumb[];

  if (activeView === "evaluations") {
    breadcrumbs.push(
      {
        text: runSet.name,
        link: projectRunSetUrl(params.teamId, project._id, runSet._id),
      },
      {
        text: "Evaluations",
      },
    );
  } else {
    breadcrumbs.push({ text: runSet.name });
  }

  return (
    <RunSetDetail
      runSet={runSet}
      isExporting={isSubmittingExport || runSet.isExporting || false}
      project={project}
      breadcrumbs={breadcrumbs}
      annotationProgress={annotationProgress}
      onStopAllRunsClicked={openStopRunSetDialog}
      onExportRunSetButtonClicked={onExportRunSetButtonClicked}
      onAddRunsClicked={() =>
        navigate(
          `${projectRunSetUrl(params.teamId, project._id, runSet._id)}/add-runs`,
        )
      }
      onUploadHumanAnnotationsClicked={openUploadHumanAnnotationsDialog}
      onDownloadAnnotationTemplateClicked={openDownloadAnnotationTemplateDialog}
      onMergeClicked={() =>
        navigate(
          `${projectRunSetUrl(params.teamId, project._id, runSet._id)}/merge`,
        )
      }
      onDuplicateClicked={() => openDuplicateRunSetDialog(runSet)}
      onUseAsTemplateClicked={() =>
        navigate(
          `${projectCreateRunSetUrl(params.teamId, project._id)}?fromRunSet=${runSet._id}`,
        )
      }
      onEditClicked={() => openEditRunSetDialog(runSet)}
      onDeleteClicked={() => openDeleteRunSetDialog(runSet)}
      activeView={activeView}
      onActiveViewChange={onActiveViewChange}
    />
  );
}
