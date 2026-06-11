import { useEffect } from "react";
import {
  data,
  redirect,
  useFetcher,
  useLoaderData,
  useNavigate,
} from "react-router";
import { toast } from "sonner";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import { promptsUrl } from "~/modules/prompts/helpers/promptUrls";
import { PromptService } from "~/modules/prompts/prompt";
import PromptLibraryAuthorization from "~/modules/prompts/promptLibraryAuthorization";
import { PromptVersionService } from "~/modules/prompts/promptVersion";
import resolveActiveTeam from "~/modules/teams/helpers/resolveActiveTeam.server";
import PromptLibraryPrompt from "../components/promptLibraryPrompt";
import { promptLibraryUrl } from "../helpers/promptLibraryUrls";
import type { Route } from "./+types/promptLibraryPrompt.route";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireAuth({ request });
  if (!PromptLibraryAuthorization.canView(user)) {
    return redirect("/");
  }

  const prompt = await PromptService.findOne({
    _id: params.promptId,
    "library.isPublished": true,
    deletedAt: { $exists: false },
  });
  if (!prompt) {
    return redirect(promptLibraryUrl());
  }

  const promptVersion = await PromptVersionService.findOne({
    prompt: prompt._id,
    version: prompt.productionVersion,
  });
  if (!promptVersion) {
    return redirect(promptLibraryUrl());
  }

  const activeTeamId = await resolveActiveTeam(request, user);

  return { prompt, promptVersion, activeTeamId };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireAuth({ request });
  const { intent } = await request.json();

  if (intent !== "COPY_PROMPT") {
    return data({ errors: { general: "Invalid intent" } }, { status: 400 });
  }

  const activeTeamId = await resolveActiveTeam(request, user);
  if (!activeTeamId) {
    return data(
      { errors: { general: "Select a team before copying a prompt." } },
      { status: 400 },
    );
  }
  if (!PromptLibraryAuthorization.canCopy(user, activeTeamId)) {
    return data(
      {
        errors: {
          general: "You can only copy prompts into a team you belong to.",
        },
      },
      { status: 403 },
    );
  }

  const copy = await PromptService.copyFromLibrary(
    params.promptId,
    activeTeamId,
    user._id,
  );
  if (!copy) {
    return data(
      { errors: { general: "Prompt not found in library." } },
      { status: 404 },
    );
  }

  return data({
    success: true,
    intent: "COPY_PROMPT",
    data: {
      prompt: copy,
      redirectTo: promptsUrl(activeTeamId, copy._id, copy.productionVersion),
    },
  });
}

export default function PromptLibraryPromptRoute() {
  const { prompt, promptVersion } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const navigate = useNavigate();

  useEffect(() => {
    if (fetcher.state !== "idle") return;
    const result = fetcher.data as
      | {
          success?: boolean;
          intent?: string;
          data?: { redirectTo?: string };
          errors?: { general?: string };
        }
      | undefined;
    if (!result) return;
    if (
      result.success &&
      result.intent === "COPY_PROMPT" &&
      result.data?.redirectTo
    ) {
      toast.success("Prompt copied to your team.");
      navigate(result.data.redirectTo);
    } else if (result.errors) {
      toast.error(result.errors.general || "An error occurred");
    }
  }, [fetcher.state, fetcher.data, navigate]);

  const onCopyPromptClicked = () => {
    fetcher.submit(JSON.stringify({ intent: "COPY_PROMPT" }), {
      method: "POST",
      encType: "application/json",
    });
  };

  const breadcrumbs = [
    { text: "Prompt Library", link: promptLibraryUrl() },
    { text: prompt.name },
  ];

  return (
    <PromptLibraryPrompt
      prompt={prompt}
      promptVersion={promptVersion}
      breadcrumbs={breadcrumbs}
      isCopying={fetcher.state !== "idle"}
      onCopyPromptClicked={onCopyPromptClicked}
    />
  );
}
