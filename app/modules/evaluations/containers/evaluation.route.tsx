import has from "lodash/has";
import throttle from "lodash/throttle";
import { useEffect, useState } from "react";
import {
  data,
  redirect,
  useFetcher,
  useLoaderData,
  useRevalidator,
} from "react-router";
import { toast } from "sonner";
import useHandleSockets from "~/modules/app/hooks/useHandleSockets";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import addDialog from "~/modules/dialogs/addDialog";
import Evaluation from "~/modules/evaluations/components/evaluation";
import AdjudicationDialogContainer from "~/modules/evaluations/containers/adjudicationDialog.container";
import { EvaluationService } from "~/modules/evaluations/evaluation";
import getTopPerformersVsGoldLabel from "~/modules/evaluations/helpers/getTopPerformersVsGoldLabel";

import ProjectAuthorization from "~/modules/projects/authorization";
import {
  projectRunSetUrl,
  projectRunSetsUrl,
  projectUrl,
  projectsUrl,
} from "~/modules/projects/helpers/projectUrls";
import { ProjectService } from "~/modules/projects/project";
import { PromptService } from "~/modules/prompts/prompt";
import { RunService } from "~/modules/runs/run";
import { RunSetService } from "~/modules/runSets/runSet";
import type { Route } from "./+types/evaluation.route";

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

  const evaluation = await EvaluationService.findOne({
    _id: params.evaluationId,
    runSet: params.runSetId,
  });
  if (!evaluation) {
    return redirect(
      `${projectRunSetUrl(params.teamId, params.projectId, params.runSetId)}/evaluations`,
    );
  }

  const evaluationRuns = await RunService.find({
    match: { _id: { $in: evaluation.runs } },
  });
  const firstRunWithPrompt = evaluationRuns.find((r) => !r.isHuman && r.prompt);
  const evaluationPrompt = firstRunWithPrompt
    ? {
        promptId: String(firstRunWithPrompt.prompt),
        promptVersion: firstRunWithPrompt.promptVersion!,
      }
    : null;

  return { project, runSet, evaluation, evaluationPrompt, evaluationRuns };
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
    case "START_ADJUDICATION": {
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

      const evaluation = await EvaluationService.findOne({
        _id: params.evaluationId,
        runSet: params.runSetId,
      });
      if (!evaluation) {
        return data(
          { errors: { evaluation: "Evaluation not found" } },
          { status: 404 },
        );
      }

      const { selectedRuns } = payload;

      if (!Array.isArray(selectedRuns) || selectedRuns.length < 2) {
        return data(
          { errors: { runs: "At least 2 runs must be selected" } },
          { status: 400 },
        );
      }

      const runSetRunIds = new Set(runSet.runs ?? []);
      if (!selectedRuns.every((id: string) => runSetRunIds.has(id))) {
        return data(
          { errors: { runs: "Selected runs must belong to this run set" } },
          { status: 400 },
        );
      }

      const { modelCode, promptId, promptVersion } = payload;

      const promptDoc = await PromptService.findOne({
        _id: promptId,
        team: params.teamId,
      });
      if (!promptDoc) {
        return data(
          { errors: { prompt: "Prompt not found" } },
          { status: 404 },
        );
      }

      await EvaluationService.startAdjudication({
        evaluationId: params.evaluationId,
        selectedRunIds: selectedRuns,
        modelCode,
        projectId: params.projectId,
        runSetId: params.runSetId,
        promptId,
        promptVersion,
        userId: user._id,
      });

      return data({
        success: true,
        intent: "START_ADJUDICATION",
      });
    }

    default: {
      return data({ errors: { intent: "Invalid intent" } }, { status: 400 });
    }
  }
}

const debounceRevalidate = throttle((revalidate) => {
  revalidate();
}, 2000);

export default function EvaluationRoute({ params }: Route.ComponentProps) {
  const { project, runSet, evaluation, evaluationPrompt, evaluationRuns } =
    useLoaderData<typeof loader>();

  const adjudicationRun =
    evaluationRuns.find(
      (r) => r.isAdjudication && !r.isComplete && !r.stoppedAt,
    ) || null;
  const adjudicationRunIds = evaluationRuns
    .filter((r) => r.isAdjudication)
    .map((r) => r._id);
  const [progress, setProgress] = useState(0);
  const [adjudicationProgress, setAdjudicationProgress] = useState(0);
  const { revalidate } = useRevalidator();
  const fetcher = useFetcher();

  useEffect(() => {
    if (fetcher.state !== "idle") return;
    if (!fetcher.data || !("success" in fetcher.data)) return;
    if (fetcher.data.intent === "START_ADJUDICATION") {
      toast.success("Adjudication started");
      revalidate();
    }
  }, [fetcher.state, fetcher.data, revalidate]);

  useHandleSockets({
    event: "ANNOTATE_RUN",
    matches: adjudicationRun
      ? [
          {
            runId: adjudicationRun._id,
            task: "ANNOTATE_RUN:START",
            status: "FINISHED",
          },
          {
            runId: adjudicationRun._id,
            task: "ANNOTATE_RUN:PROCESS",
            status: "STARTED",
          },
          {
            runId: adjudicationRun._id,
            task: "ANNOTATE_RUN:PROCESS",
            status: "FINISHED",
          },
          {
            runId: adjudicationRun._id,
            task: "ANNOTATE_RUN:FINISH",
            status: "FINISHED",
          },
        ]
      : [],
    callback: (payload) => {
      if (has(payload, "progress")) {
        setAdjudicationProgress(payload.progress);
      }
      debounceRevalidate(revalidate);
    },
  });

  useHandleSockets({
    event: "CREATE_EVALUATION",
    matches: [
      {
        evaluationId: evaluation._id,
        task: "CREATE_EVALUATION:START",
        status: "FINISHED",
      },
      {
        evaluationId: evaluation._id,
        task: "CREATE_EVALUATION:PROCESS",
        status: "STARTED",
      },
      {
        evaluationId: evaluation._id,
        task: "CREATE_EVALUATION:PROCESS",
        status: "UPDATED",
      },
      {
        evaluationId: evaluation._id,
        task: "CREATE_EVALUATION:PROCESS",
        status: "FINISHED",
      },
      {
        evaluationId: evaluation._id,
        task: "CREATE_EVALUATION:FINISH",
        status: "FINISHED",
      },
    ],
    callback: (payload) => {
      if (has(payload, "progress")) {
        setProgress(payload.progress);
      }
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
    {
      text: runSet.name,
      link: projectRunSetUrl(params.teamId, project._id, runSet._id),
    },
    {
      text: "Evaluations",
      link: `${projectRunSetUrl(params.teamId, project._id, runSet._id)}/evaluations`,
    },
    { text: evaluation.name },
  ];

  const report = evaluation.report || [];
  const [activeTab, setActiveTab] = useState(report[0]?.fieldKey || "");

  // Set the first tab when the report arrives after evaluation completes
  useEffect(() => {
    if (!activeTab && report[0]?.fieldKey) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab(report[0].fieldKey);
    }
  }, [activeTab, report]);

  const activeReport = report.find((r) => r.fieldKey === activeTab);
  const performers = activeReport
    ? getTopPerformersVsGoldLabel(activeReport, evaluation.baseRun).filter(
        (p) => !adjudicationRunIds.includes(p.runId),
      )
    : [];
  const nonHumanPerformerCount = performers.filter((p) => !p.isHuman).length;
  const canStartAdjudication =
    evaluation.isComplete === true && nonHumanPerformerCount >= 2;

  const submitStartAdjudication = (
    selectedRuns: string[],
    modelCode: string,
    promptId: string,
    promptVersion: number,
  ) => {
    fetcher.submit(
      JSON.stringify({
        intent: "START_ADJUDICATION",
        payload: { selectedRuns, modelCode, promptId, promptVersion },
      }),
      { method: "POST", encType: "application/json" },
    );
  };

  const openAdjudicationDialog = () => {
    addDialog(
      <AdjudicationDialogContainer
        report={activeReport || null}
        baseRun={evaluation.baseRun}
        adjudicationRunIds={adjudicationRunIds}
        evaluationPrompt={evaluationPrompt}
        onStartAdjudication={submitStartAdjudication}
      />,
    );
  };

  return (
    <Evaluation
      evaluation={evaluation}
      breadcrumbs={breadcrumbs}
      progress={progress}
      adjudicationRun={adjudicationRun}
      adjudicationProgress={adjudicationProgress}
      activeTab={activeTab}
      onActiveTabChanged={setActiveTab}
      canStartAdjudication={canStartAdjudication}
      onAdjudicationClicked={openAdjudicationDialog}
    />
  );
}
