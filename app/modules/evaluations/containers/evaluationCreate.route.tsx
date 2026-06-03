import { PageHeader, PageHeaderLeft } from "@/components/ui/pageHeader";
import { useEffect, useMemo, useState } from "react";
import {
  data,
  redirect,
  useActionData,
  useLoaderData,
  useNavigate,
  useSubmit,
} from "react-router";
import Breadcrumbs from "~/modules/app/components/breadcrumbs";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import EvaluationCreate from "~/modules/evaluations/components/evaluationCreate";
import { EvaluationService } from "~/modules/evaluations/evaluation";
import getAnnotationSchemaFieldCounts from "~/modules/evaluations/helpers/getAnnotationSchemaFieldCounts";
import getEvaluationCompatibleRuns from "~/modules/evaluations/helpers/getEvaluationCompatibleRuns";
import getRunDisabledReason from "~/modules/evaluations/helpers/getRunDisabledReason";
import isAbleToCreateEvaluation from "~/modules/evaluations/helpers/isAbleToCreateEvaluation";
import ProjectAuthorization from "~/modules/projects/authorization";
import {
  projectEvaluationUrl,
  projectRunSetUrl,
  projectRunSetsUrl,
  projectUrl,
} from "~/modules/projects/helpers/projectUrls";
import { ProjectService } from "~/modules/projects/project";
import { RunService } from "~/modules/runs/run";
import { RunSetService } from "~/modules/runSets/runSet";
import type { Route } from "./+types/evaluationCreate.route";

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

  const runs = runSet.runs?.length
    ? await RunService.find({ match: { _id: { $in: runSet.runs } } })
    : [];

  return { project, runSet, runs };
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

  const runSet = await RunSetService.findOne({
    _id: params.runSetId,
    project: params.projectId,
  });
  if (!runSet) {
    return data({ errors: { runSet: "Run set not found" } }, { status: 404 });
  }

  const { intent, payload = {} } = await request.json();

  switch (intent) {
    case "CREATE_EVALUATION": {
      if (!isAbleToCreateEvaluation(runSet)) {
        return data(
          {
            errors: {
              runs: "At least 2 runs are required to create an evaluation",
            },
          },
          { status: 400 },
        );
      }

      const { name, baseRun, selectedRuns, selectedAnnotationFields } = payload;
      const errors: Record<string, string> = {};

      if (typeof name !== "string" || name.trim().length < 1) {
        errors.name = "Evaluation name is required";
      }

      if (!baseRun) {
        errors.baseRun = "A base run must be selected";
      }

      if (!Array.isArray(selectedRuns) || selectedRuns.length < 1) {
        errors.runs = "At least 1 comparison run must be selected";
      }

      if (
        !Array.isArray(selectedAnnotationFields) ||
        selectedAnnotationFields.length < 1
      ) {
        errors.annotationFields =
          "At least 1 annotation field must be selected";
      }

      if (Object.keys(errors).length > 0) {
        return data({ errors }, { status: 400 });
      }

      const allRunIds = [baseRun, ...selectedRuns];
      const fetchedRuns = await RunService.find({
        match: { _id: { $in: allRunIds }, project: params.projectId },
      });

      if (fetchedRuns.length !== allRunIds.length) {
        return data(
          { errors: { runs: "One or more runs could not be found" } },
          { status: 400 },
        );
      }

      const nonSelectableRun = fetchedRuns.find(
        (run) => !!getRunDisabledReason(run),
      );
      if (nonSelectableRun) {
        return data(
          {
            errors: {
              runs: `Run "${nonSelectableRun.name}" is not selectable: ${getRunDisabledReason(nonSelectableRun)}`,
            },
          },
          { status: 400 },
        );
      }

      const compatible = getEvaluationCompatibleRuns(fetchedRuns, baseRun);

      if (compatible.length !== selectedRuns.length) {
        return data(
          {
            errors: {
              runs: "All runs must share the same sessions and at least one annotation field",
            },
          },
          { status: 400 },
        );
      }

      const evaluation = await EvaluationService.create({
        name: name.trim(),
        project: params.projectId,
        runSet: params.runSetId,
        baseRun,
        runs: allRunIds,
        annotationFields: selectedAnnotationFields,
        isRunning: true,
      });

      EvaluationService.start(evaluation);

      return {
        intent: "CREATE_EVALUATION",
        data: {
          evaluationId: evaluation._id,
          runSetId: params.runSetId,
          projectId: params.projectId,
        },
      };
    }

    default: {
      return data({ errors: { intent: "Invalid intent" } }, { status: 400 });
    }
  }
}

export default function EvaluationCreateRoute({
  params,
}: Route.ComponentProps) {
  const { project, runSet, runs } = useLoaderData<typeof loader>();
  const actionData = useActionData();
  const navigate = useNavigate();
  const submit = useSubmit();
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [baseRun, setBaseRun] = useState<string | null>(null);
  const [selectedRuns, setSelectedRuns] = useState<string[]>([]);
  const [selectedAnnotationFields, setSelectedAnnotationFields] = useState<
    string[]
  >([]);

  useEffect(() => {
    if (actionData?.intent === "CREATE_EVALUATION") {
      navigate(
        projectEvaluationUrl(
          params.teamId,
          actionData.data.projectId,
          actionData.data.runSetId,
          actionData.data.evaluationId,
        ),
      );
    }
  }, [actionData, navigate, params.teamId]);

  const compatibleRuns = useMemo(
    () => getEvaluationCompatibleRuns(runs, baseRun),
    [baseRun, runs],
  );

  const annotationSchemaFieldCounts = useMemo(
    () => getAnnotationSchemaFieldCounts(runs, baseRun, compatibleRuns),
    [runs, baseRun, compatibleRuns],
  );

  const handleBaseRunChanged = (id: string | null) => {
    setBaseRun(id);
    if (!id) {
      setSelectedRuns([]);
      setSelectedAnnotationFields([]);
      return;
    }
    const compatible = getEvaluationCompatibleRuns(runs, id);
    setSelectedRuns(
      compatible
        .filter((run) => !getRunDisabledReason(run))
        .map((run) => run._id),
    );
    setSelectedAnnotationFields([]);
  };

  const handleAnnotationFieldToggled = (fieldKey: string) => {
    if (selectedAnnotationFields.includes(fieldKey)) {
      setSelectedAnnotationFields(
        selectedAnnotationFields.filter((key) => key !== fieldKey),
      );
    } else {
      setSelectedAnnotationFields([...selectedAnnotationFields, fieldKey]);
    }
  };

  const isSubmitDisabled =
    isSubmitting ||
    !name.trim() ||
    !baseRun ||
    selectedRuns.length === 0 ||
    selectedAnnotationFields.length === 0;

  const breadcrumbs = [
    { text: "Projects", link: "/" },
    { text: project.name, link: projectUrl(params.teamId, project._id) },
    {
      text: "Run Sets",
      link: projectRunSetsUrl(params.teamId, project._id),
    },
    {
      text: runSet.name,
      link: projectRunSetUrl(params.teamId, project._id, runSet._id),
    },
    { text: "Create Evaluation" },
  ];

  const handleSubmit = async () => {
    setIsSubmitting(true);
    submit(
      JSON.stringify({
        intent: "CREATE_EVALUATION",
        payload: { name, baseRun, selectedRuns, selectedAnnotationFields },
      }),
      { method: "POST", encType: "application/json" },
    );
  };

  const handleCancel = () => {
    navigate(
      `${projectRunSetUrl(params.teamId, project._id, runSet._id)}/evaluations`,
    );
  };

  return (
    <div className="px-8 pt-8">
      <PageHeader>
        <PageHeaderLeft>
          <Breadcrumbs breadcrumbs={breadcrumbs} />
        </PageHeaderLeft>
      </PageHeader>
      <div className="mb-8">
        <p className="text-muted-foreground">
          Create a new evaluation for this run set
        </p>
      </div>

      <EvaluationCreate
        name={name}
        isSubmitting={isSubmitting}
        isSubmitDisabled={isSubmitDisabled}
        isAbleToCreateEvaluation={isAbleToCreateEvaluation(runSet)}
        teamId={params.teamId}
        projectId={project._id}
        runSetId={runSet._id}
        runs={runs}
        baseRun={baseRun}
        compatibleRuns={compatibleRuns}
        selectedRuns={selectedRuns}
        annotationSchemaFieldCounts={annotationSchemaFieldCounts}
        selectedAnnotationFields={selectedAnnotationFields}
        onNameChanged={setName}
        onBaseRunChanged={handleBaseRunChanged}
        onSelectedRunsChanged={setSelectedRuns}
        onAnnotationFieldToggled={handleAnnotationFieldToggled}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  );
}
