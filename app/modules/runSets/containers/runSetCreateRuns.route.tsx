import { PageHeader, PageHeaderLeft } from "@/components/ui/pageHeader";
import { useEffect } from "react";
import {
  data,
  redirect,
  useFetcher,
  useLoaderData,
  useNavigate,
} from "react-router";
import { toast } from "sonner";
import trackServerEvent from "~/modules/analytics/helpers/trackServerEvent.server";
import Breadcrumbs from "~/modules/app/components/breadcrumbs";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import { TeamBillingService } from "~/modules/billing/teamBilling";
import ProjectAuthorization from "~/modules/projects/authorization";
import {
  projectRunSetUrl,
  projectRunSetsUrl,
  projectUrl,
} from "~/modules/projects/helpers/projectUrls";
import { ProjectService } from "~/modules/projects/project";
import createGeneralJob from "~/modules/queues/helpers/createGeneralJob";
import { RunService } from "~/modules/runs/run";
import getUsedPromptModels, {
  type PromptModelPair,
} from "~/modules/runSets/helpers/getUsedPromptModels";
import { RunSetService } from "~/modules/runSets/runSet";
import type { Route } from "./+types/runSetCreateRuns.route";
import RunSetCreateRunsContainer from "./runSetCreateRuns.container";

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

  const existingRuns = runSet.runs?.length
    ? await RunService.find({ match: { _id: { $in: runSet.runs } } })
    : [];

  const usedPromptModels = getUsedPromptModels(existingRuns);

  return { runSet, project, usedPromptModels };
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
    case "CREATE_RUNS": {
      const { definitions } = payload;

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

      const errors: Record<string, string> = {};

      if (!Array.isArray(definitions) || definitions.length === 0) {
        errors.definitions = "At least one run is required";
      }

      if (Object.keys(errors).length > 0) {
        return data({ errors }, { status: 400 });
      }

      const teamId =
        typeof project.team === "string" ? project.team : project.team._id;
      const [balance, estimate] = await Promise.all([
        TeamBillingService.getBalance(teamId),
        TeamBillingService.estimateCost({
          teamId,
          projectId: params.projectId,
          sessionIds: runSet.sessions ?? [],
          definitions,
          shouldRunVerification: !!payload.shouldRunVerification,
        }),
      ]);
      if (estimate.estimatedCost > balance) {
        return data(
          { errors: { credits: "Insufficient credits to start runs" } },
          { status: 402 },
        );
      }

      const result = await RunSetService.createRunsForRunSet({
        runSetId: params.runSetId,
        definitions,
        shouldRunVerification: !!payload.shouldRunVerification,
        userId: user._id,
      });

      if (!result.runSet) {
        return data(
          { errors: { runSet: "Run set not found" } },
          { status: 404 },
        );
      }

      if (result.errors.length > 0 && result.createdRunIds.length === 0) {
        return data(
          { errors: { duplicate: result.errors.join(", ") } },
          { status: 400 },
        );
      }

      if (result.createdRunIds.length > 0) {
        trackServerEvent({ name: "run_created", userId: user._id });
        await createGeneralJob("TRACK_FIRST_RUN", { userId: user._id });
      }

      return {
        intent: "CREATE_RUNS",
        data: {
          runSetId: params.runSetId,
          projectId: params.projectId,
          createdCount: result.createdRunIds.length,
          errors: result.errors,
        },
      };
    }

    default: {
      return data({ errors: { intent: "Invalid intent" } }, { status: 400 });
    }
  }
}

export default function RunSetCreateRunsRoute({
  params,
}: Route.ComponentProps) {
  const { runSet, project, usedPromptModels } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const fetcher = useFetcher();

  useEffect(() => {
    if (fetcher.state !== "idle") return;
    if (fetcher.data?.intent !== "CREATE_RUNS") return;

    const createdCount = fetcher.data.data?.createdCount;
    if (createdCount > 0) {
      const runErrors = fetcher.data?.data?.errors;
      if (runErrors && runErrors.length > 0) {
        toast.warning(
          `${createdCount} run(s) created, but ${runErrors.length} run(s) failed to start`,
        );
      } else {
        toast.success(`${createdCount} run(s) created successfully`);
      }
      navigate(projectRunSetUrl(params.teamId, project._id, runSet._id));
    }
  }, [
    fetcher.state,
    fetcher.data,
    navigate,
    project._id,
    runSet._id,
    params.teamId,
  ]);

  const handleSubmit = (requestBody: string) => {
    fetcher.submit(requestBody, {
      method: "POST",
      encType: "application/json",
    });
  };

  const handleCancel = () => {
    navigate(projectRunSetUrl(params.teamId, project._id, runSet._id));
  };

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
    { text: "Create Runs" },
  ];

  return (
    <div>
      <div className="px-8 pt-8">
        <PageHeader>
          <PageHeaderLeft>
            <Breadcrumbs breadcrumbs={breadcrumbs} />
          </PageHeaderLeft>
        </PageHeader>
        <div className="mb-8">
          <p className="text-muted-foreground">
            Add new runs to "{runSet.name}" by selecting prompts and models
          </p>
        </div>
      </div>

      <RunSetCreateRunsContainer
        runSet={runSet}
        usedPromptModels={usedPromptModels as PromptModelPair[]}
        projectId={project._id}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={fetcher.state !== "idle"}
        errors={
          (fetcher.data as { errors?: Record<string, string> })?.errors || {}
        }
      />
    </div>
  );
}
