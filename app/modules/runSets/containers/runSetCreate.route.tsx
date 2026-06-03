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
import { PromptService } from "~/modules/prompts/prompt";
import createGeneralJob from "~/modules/queues/helpers/createGeneralJob";
import type { RunAnnotationType } from "~/modules/runs/runs.types";
import RunSetCreatorContainer from "~/modules/runSets/containers/runSetCreator.container";
import { RunSetService } from "~/modules/runSets/runSet";
import type { PrefillData } from "~/modules/runSets/runSets.types";
import { SessionService } from "~/modules/sessions/session";
import type { Route } from "./+types/runSetCreate.route";

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

  const url = new URL(request.url);
  const fromRunId = url.searchParams.get("fromRun");
  const fromRunSetId = url.searchParams.get("fromRunSet");

  let prefillData: PrefillData | null = null;
  let prefillSessionIds: string[] = [];

  if (fromRunId) {
    ({ prefillData, prefillSessionIds } =
      await RunSetService.getPrefillDataFromRun(fromRunId, params.projectId));
  } else if (fromRunSetId) {
    ({ prefillData, prefillSessionIds } =
      await RunSetService.getPrefillDataFromRunSet(
        fromRunSetId,
        params.projectId,
      ));
  }

  const prefillSessions = prefillSessionIds.length
    ? await SessionService.find({
        match: { _id: { $in: prefillSessionIds } },
        select: "_id inputTokens",
      })
    : [];

  if (prefillData) {
    const byId = new Map(prefillSessions.map((s) => [s._id, s.inputTokens]));
    prefillData.selectedSessions = prefillSessionIds.map((id) => ({
      _id: id,
      inputTokens: byId.get(id),
    }));
  }

  return { project, prefillData };
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

  const { name, annotationType, definitions, sessions } = payload;

  switch (intent) {
    case "CREATE_RUN_SET": {
      const errors: Record<string, string> = {};

      if (typeof name !== "string" || name.trim().length < 1) {
        errors.name = "Run set name is required";
      }

      if (!["PER_UTTERANCE", "PER_SESSION"].includes(annotationType)) {
        errors.annotationType = "Invalid annotation type";
      }

      if (!Array.isArray(definitions) || definitions.length === 0) {
        errors.definitions = "At least one run is required";
      }

      if (!Array.isArray(sessions) || sessions.length === 0) {
        errors.sessions = "At least one session is required";
      }

      if (Object.keys(errors).length > 0) {
        return data({ errors }, { status: 400 });
      }

      const promptIds: string[] = Array.from(
        new Set(
          definitions
            .map((d: { prompt?: { promptId?: string } }) => d.prompt?.promptId)
            .filter((id: unknown): id is string => typeof id === "string"),
        ),
      );
      const prompts = await PromptService.find({
        match: { _id: { $in: promptIds }, team: params.teamId },
      });
      if (prompts.length !== promptIds.length) {
        return data(
          { errors: { definitions: "One or more prompts not found" } },
          { status: 404 },
        );
      }

      const teamId =
        typeof project.team === "string" ? project.team : project.team._id;
      const [balance, estimate] = await Promise.all([
        TeamBillingService.getBalance(teamId),
        TeamBillingService.estimateCost({
          teamId,
          projectId: params.projectId,
          sessionIds: sessions,
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

      const result = await RunSetService.createWithRuns({
        project: params.projectId,
        name,
        sessions,
        definitions,
        annotationType: annotationType as RunAnnotationType,
        shouldRunVerification: !!payload.shouldRunVerification,
        userId: user._id,
      });

      trackServerEvent({ name: "run_set_created", userId: user._id });
      trackServerEvent({ name: "run_created", userId: user._id });
      await createGeneralJob("TRACK_FIRST_RUN", { userId: user._id });

      return {
        intent: "CREATE_RUN_SET",
        data: {
          runSetId: result.runSet._id,
          projectId: params.projectId,
          errors: result.errors,
        },
      };
    }

    default: {
      return data({ errors: { intent: "Invalid intent" } }, { status: 400 });
    }
  }
}

export default function RunSetCreateRoute({ params }: Route.ComponentProps) {
  const { project, prefillData } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const fetcher = useFetcher();

  const breadcrumbs = [
    { text: "Projects", link: "/" },
    { text: project.name, link: projectUrl(params.teamId, project._id) },
    {
      text: "Run Sets",
      link: projectRunSetsUrl(params.teamId, project._id),
    },
    { text: "Create Run Set" },
  ];

  useEffect(() => {
    if (fetcher.state !== "idle") return;
    if (fetcher.data?.intent !== "CREATE_RUN_SET") return;

    const runSetId = fetcher.data.data?.runSetId;
    if (runSetId) {
      const runErrors = fetcher.data?.data?.errors;
      if (runErrors && runErrors.length > 0) {
        toast.warning(
          `RunSet created, but ${runErrors.length} run(s) failed to start`,
        );
      } else {
        toast.success("RunSet created successfully");
      }
      navigate(projectRunSetUrl(params.teamId, project._id, runSetId));
    }
  }, [fetcher.state, fetcher.data, navigate, project._id, params.teamId]);

  const handleSubmit = (requestBody: string) => {
    fetcher.submit(requestBody, {
      method: "POST",
      encType: "application/json",
    });
  };

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
            Set up a new runSet with your preferred annotation settings
          </p>
        </div>
      </div>

      <RunSetCreatorContainer
        prefillData={prefillData}
        teamId={params.teamId}
        projectId={project._id}
        onSubmit={handleSubmit}
        isLoading={fetcher.state !== "idle"}
        errors={
          (fetcher.data as { errors?: Record<string, string> })?.errors || {}
        }
      />
    </div>
  );
}
