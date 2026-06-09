import { useContext, useEffect } from "react";
import {
  data,
  redirect,
  useFetcher,
  useLoaderData,
  useNavigate,
  useParams,
} from "react-router";
import { toast } from "sonner";
import getReferenceId from "~/helpers/getReferenceId";
import { AuthenticationContext } from "~/modules/authentication/authentication.context";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import PromptAuthorization from "~/modules/prompts/authorization";
import { usePromptActions } from "~/modules/prompts/hooks/usePromptActions";
import { RunService } from "~/modules/runs/run";
import Prompt from "../components/prompt";
import { PromptPublishedError } from "../errors/promptPublishedError";
import { promptsUrl } from "../helpers/promptUrls";
import { PromptService } from "../prompt";
import { PromptVersionService } from "../promptVersion";
import type { Route } from "./+types/prompt.route";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireAuth({ request });
  const prompt = await PromptService.findOne({
    _id: params.promptId,
    team: params.teamId,
  });
  if (!prompt) {
    return redirect(promptsUrl(params.teamId));
  }
  if (!PromptAuthorization.canView(user, prompt)) {
    throw new Error("You do not have permission to view this prompt.");
  }
  const promptVersions = await PromptVersionService.find({
    match: { prompt: params.promptId },
    sort: { version: -1 },
  });
  return { prompt, promptVersions };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { intent, entityId, payload = {} } = await request.json();

  const { version } = payload;

  const user = await requireAuth({ request });
  const prompt = await PromptService.findOne({
    _id: entityId,
    team: params.teamId,
  });
  if (!prompt) {
    throw new Error("Prompt not found");
  }
  if (!PromptAuthorization.canUpdate(user, prompt)) {
    throw new Error("You do not have permission to update this prompt.");
  }

  switch (intent) {
    case "CREATE_PROMPT_VERSION": {
      const previousVersionDocs = await PromptVersionService.find({
        match: { prompt: entityId, version: Number(version) },
      });

      if (previousVersionDocs.length === 0) {
        return data(
          { errors: { general: "Previous prompt version not found" } },
          { status: 400 },
        );
      }

      const promptVersion = await PromptVersionService.createNextVersion(
        entityId,
        previousVersionDocs[0],
      );

      return data({
        success: true,
        intent: "CREATE_PROMPT_VERSION",
        data: promptVersion,
      });
    }
    case "UPDATE_PROMPT": {
      const { name } = payload;
      if (typeof name !== "string" || !name.trim()) {
        return data(
          { errors: { general: "Prompt name is required" } },
          { status: 400 },
        );
      }

      const updated = await PromptService.updateById(entityId, {
        name: name.trim(),
      });
      return data({
        success: true,
        intent: "UPDATE_PROMPT",
        data: updated,
      });
    }
    case "DELETE_PROMPT": {
      if (!PromptAuthorization.canDelete(user, prompt)) {
        return data(
          {
            errors: {
              general: "You do not have permission to delete this prompt.",
            },
          },
          { status: 403 },
        );
      }

      const runsUsingPromptCount = await RunService.count({
        prompt: entityId,
        isComplete: false,
        isHuman: { $ne: true },
      });

      if (runsUsingPromptCount > 0) {
        return data(
          {
            errors: {
              general: `Cannot delete prompt: ${runsUsingPromptCount} active run(s) reference it. Wait for runs to complete or create a new prompt for future runs.`,
            },
          },
          { status: 400 },
        );
      }

      try {
        await PromptService.softDelete(entityId);
      } catch (error) {
        if (error instanceof PromptPublishedError) {
          return data({ errors: { general: error.message } }, { status: 400 });
        }
        throw error;
      }

      return data({
        success: true,
        intent: "DELETE_PROMPT",
      });
    }
    default:
      return data({ errors: { general: "Invalid intent" } }, { status: 400 });
  }
}

export default function PromptRoute() {
  const loaderData = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const { teamId, promptId, version } = useParams();

  const fetcher = useFetcher();

  const { prompt, promptVersions } = loaderData;
  const user = useContext(AuthenticationContext);
  const canDelete = PromptAuthorization.canDelete(user, prompt);

  const { openEditPromptDialog, openDeletePromptDialog } = usePromptActions({
    onDeleteSuccess: () => navigate(promptsUrl(teamId!)),
  });

  const submitCreatePromptVersion = () => {
    fetcher.submit(
      JSON.stringify({
        intent: "CREATE_PROMPT_VERSION",
        entityId: promptId,
        payload: { version },
      }),
      { method: "POST", encType: "application/json" },
    );
  };

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      if (
        fetcher.data.success &&
        fetcher.data.intent === "CREATE_PROMPT_VERSION"
      ) {
        navigate(
          promptsUrl(
            teamId!,
            fetcher.data.data.prompt,
            fetcher.data.data.version,
          ),
        );
      } else if (fetcher.data.errors) {
        toast.error(fetcher.data.errors.general || "An error occurred");
      }
    }
  }, [fetcher.state, fetcher.data, navigate, teamId]);

  const breadcrumbs = [
    {
      text: "Prompts",
      link: promptsUrl(getReferenceId(prompt.team)),
    },
    {
      text: prompt.name,
    },
  ];

  return (
    <Prompt
      prompt={prompt}
      promptVersions={promptVersions}
      version={Number(version)}
      breadcrumbs={breadcrumbs}
      canDelete={canDelete}
      onCreatePromptVersionClicked={submitCreatePromptVersion}
      onEditPromptButtonClicked={openEditPromptDialog}
      onDeletePromptButtonClicked={openDeletePromptDialog}
    />
  );
}
