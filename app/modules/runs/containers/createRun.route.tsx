import map from "lodash/map";
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
import useSubmitGuard from "~/modules/app/hooks/useSubmitGuard";
import getSessionUserTeams from "~/modules/authentication/helpers/getSessionUserTeams";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import { TeamBillingService } from "~/modules/billing/teamBilling";
import { findModelByCode } from "~/modules/llm/modelRegistry";
import ProjectAuthorization from "~/modules/projects/authorization";
import {
  projectRunUrl,
  projectUrl,
} from "~/modules/projects/helpers/projectUrls";
import { ProjectService } from "~/modules/projects/project";
import createGeneralJob from "~/modules/queues/helpers/createGeneralJob";
import { RunService } from "~/modules/runs/run";
import type { CreateRun as CreateRunPayload } from "~/modules/runs/runs.types";
import { validateRunResources } from "~/modules/runs/services/validateRunResources.server";
import CreateRunComponent from "../components/createRun";
import type { Route } from "./+types/createRun.route";

export async function loader({ request, params }: Route.LoaderArgs) {
  const authenticationTeams = await getSessionUserTeams({ request });
  const teamIds = map(authenticationTeams, "team");
  if (!teamIds.includes(params.teamId)) {
    return redirect("/");
  }
  const project = await ProjectService.findOne({
    _id: params.projectId,
    team: params.teamId,
  });
  if (!project) {
    return redirect("/");
  }

  const url = new URL(request.url);
  const duplicateFrom = url.searchParams.get("duplicateFrom");

  let initialRun = null;
  let duplicateWarnings: string[] = [];

  if (duplicateFrom) {
    initialRun = await RunService.findOne({
      _id: duplicateFrom,
      project: params.projectId,
    });
    if (initialRun) {
      duplicateWarnings = await validateRunResources(initialRun);
    }
  }

  return { project, initialRun, duplicateWarnings };
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

  const { name, annotationType, prompt, promptVersion, model, sessions } =
    payload;

  switch (intent) {
    case "CREATE_AND_START_RUN": {
      const errors: Record<string, string> = {};

      if (typeof name !== "string" || name.trim().length < 3) {
        errors.name = "Run name must be at least 3 characters";
      }

      if (!["PER_UTTERANCE", "PER_SESSION"].includes(annotationType)) {
        errors.annotationType = "Invalid annotation type";
      }

      if (!prompt) {
        errors.prompt = "A prompt is required";
      }

      if (!promptVersion) {
        errors.promptVersion = "A prompt version is required";
      }

      if (!findModelByCode(model)) {
        errors.model = "Invalid model";
      }

      if (!Array.isArray(sessions) || sessions.length === 0) {
        errors.sessions = "At least one session is required";
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
          sessionIds: sessions,
          definitions: [
            {
              key: `${prompt}:${promptVersion}:${model}`,
              modelCode: model,
              prompt: {
                promptId: prompt,
                promptName: "",
                version: Number(promptVersion),
              },
            },
          ],
          shouldRunVerification: !!payload.shouldRunVerification,
        }),
      ]);
      if (estimate.estimatedCost > balance) {
        return data(
          { errors: { credits: "Insufficient credits to start a run" } },
          { status: 402 },
        );
      }

      const run = await RunService.create({
        project: params.projectId,
        name,
        sessions,
        annotationType,
        prompt,
        promptVersion: Number(promptVersion),
        modelCode: model,
        shouldRunVerification: !!payload.shouldRunVerification,
        createdBy: user._id,
      });

      await RunService.start(run, undefined, user._id);
      trackServerEvent({ name: "run_created", userId: user._id });
      await createGeneralJob("TRACK_FIRST_RUN", { userId: user._id });

      return data({ intent: "CREATE_AND_START_RUN", data: run });
    }
    default: {
      return {};
    }
  }
}

export default function ProjectCreateRunRoute({
  params,
}: Route.ComponentProps) {
  const { project, initialRun, duplicateWarnings } =
    useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const { isSubmitting, guard } = useSubmitGuard(
    fetcher,
    fetcher.data?.intent === "CREATE_AND_START_RUN",
  );

  const onStartRunClicked = ({
    name,
    selectedAnnotationType,
    selectedPrompt,
    selectedPromptVersion,
    selectedModel,
    selectedSessions,
    shouldRunVerification,
  }: CreateRunPayload) => {
    fetcher.submit(
      JSON.stringify({
        intent: "CREATE_AND_START_RUN",
        payload: {
          name,
          annotationType: selectedAnnotationType,
          prompt: selectedPrompt,
          promptVersion: Number(selectedPromptVersion),
          model: selectedModel,
          sessions: selectedSessions,
          shouldRunVerification,
        },
      }),
      { method: "POST", encType: "application/json" },
    );
  };

  useEffect(() => {
    if (fetcher.state !== "idle") return;
    if (!fetcher.data) return;
    if ("errors" in fetcher.data) {
      toast.error(Object.values(fetcher.data.errors)[0] as string);
      return;
    }
    if (
      "intent" in fetcher.data &&
      fetcher.data.intent === "CREATE_AND_START_RUN"
    ) {
      toast.success("Run created and started");
      navigate(
        projectRunUrl(
          params.teamId,
          fetcher.data.data.project,
          fetcher.data.data._id,
        ),
      );
    }
  }, [fetcher.state, fetcher.data, navigate, params.teamId]);

  const breadcrumbs = [
    { text: "Projects", link: `/` },
    { text: project!.name, link: projectUrl(params.teamId, project!._id) },
    { text: "Create run" },
  ];

  return (
    <CreateRunComponent
      breadcrumbs={breadcrumbs}
      onStartRunClicked={guard(onStartRunClicked)}
      isSubmitting={isSubmitting}
      initialRun={initialRun}
      duplicateWarnings={duplicateWarnings}
      projectId={project._id}
    />
  );
}
