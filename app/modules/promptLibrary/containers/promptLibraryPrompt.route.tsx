import { data, redirect, useFetcher, useLoaderData } from "react-router";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import { PromptService } from "~/modules/prompts/prompt";
import PromptLibraryAuthorization from "~/modules/prompts/promptLibraryAuthorization";
import { PromptVersionService } from "~/modules/prompts/promptVersion";
import resolveActiveTeam from "~/modules/teams/helpers/resolveActiveTeam.server";
import PromptLibraryPrompt from "../components/promptLibraryPrompt";
import copyPromptToActiveTeam from "../helpers/copyPromptToActiveTeam.server";
import { promptLibraryUrl } from "../helpers/promptLibraryUrls";
import { useCopyPromptResult } from "../hooks/useCopyPromptResult";
import type { Route } from "./+types/promptLibraryPrompt.route";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireAuth({ request });
  if (!PromptLibraryAuthorization.canView(user)) {
    return redirect("/");
  }

  const [prompt, activeTeamId] = await Promise.all([
    PromptService.findOne({
      _id: params.promptId,
      "library.isPublished": true,
      deletedAt: { $exists: false },
    }),
    resolveActiveTeam(request, user),
  ]);
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

  return { prompt, promptVersion, activeTeamId };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireAuth({ request });
  const { intent } = await request.json();

  if (intent !== "COPY_PROMPT") {
    return data({ errors: { general: "Invalid intent" } }, { status: 400 });
  }

  return copyPromptToActiveTeam(request, user, params.promptId);
}

export default function PromptLibraryPromptRoute() {
  const { prompt, promptVersion } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  useCopyPromptResult(fetcher);

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
