import { data } from "react-router";
import { promptsUrl } from "~/modules/prompts/helpers/promptUrls";
import { PromptService } from "~/modules/prompts/prompt";
import PromptLibraryAuthorization from "~/modules/prompts/promptLibraryAuthorization";
import resolveActiveTeam from "~/modules/teams/helpers/resolveActiveTeam.server";
import type { User } from "~/modules/users/users.types";

export default async function copyPromptToActiveTeam(
  request: Request,
  user: User,
  promptId: string,
) {
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
    promptId,
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
