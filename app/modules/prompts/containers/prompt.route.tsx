import { useContext } from "react";
import { redirect, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { AuthenticationContext } from "~/modules/authentication/authentication.context";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import useCache from "~/modules/cache/hooks/useCache";
import addDialog from "~/modules/dialogs/addDialog";
import PromptAuthorization from "~/modules/prompts/authorization";
import PromptLibraryAuthorization from "~/modules/prompts/promptLibraryAuthorization";
import DeletePromptDialog from "../components/deletePromptDialog";
import EditPromptDialog from "../components/editPromptDialog";
import Prompt from "../components/prompt";
import PublishPromptDialog from "../components/publishPromptDialog";
import UnpublishPromptDialog from "../components/unpublishPromptDialog";
import { promptsUrl } from "../helpers/promptUrls";
import { PromptService } from "../prompt";
import type {
  PromptAuthor,
  PromptPaperRef,
  Prompt as PromptType,
} from "../prompts.types";
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
  return {};
}

export default function PromptRoute({ params }: Route.ComponentProps) {
  const { teamId, promptId } = params;
  const { version } = useParams();
  const navigate = useNavigate();
  const user = useContext(AuthenticationContext);

  const teamQuery = { teamId };
  const prompt = useCache({
    api: `/api/prompts/${promptId}`,
    query: teamQuery,
  });
  const promptVersions = useCache({
    api: `/api/prompts/${promptId}/versions`,
    query: teamQuery,
  });

  if (!prompt.data || !promptVersions.data) return null;

  const submitCreatePromptVersion = () => {
    promptVersions.mutate(
      { method: "POST", query: teamQuery, data: { version: Number(version) } },
      {
        onSuccess: (response) =>
          navigate(promptsUrl(teamId, promptId, response.data.version)),
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const openEditPromptDialog = (prompt: PromptType) => {
    addDialog(
      <EditPromptDialog
        prompt={prompt}
        onEditPromptClicked={submitEditPrompt}
      />,
    );
  };

  const submitEditPrompt = ({ name }: PromptType) => {
    prompt.mutate(
      { method: "PUT", query: teamQuery, data: { name } },
      {
        onSuccess: () => {
          toast.success("Prompt updated");
          addDialog(null);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const openDeletePromptDialog = (prompt: PromptType) => {
    addDialog(
      <DeletePromptDialog
        prompt={prompt}
        onDeletePromptClicked={submitDeletePrompt}
      />,
    );
  };

  const submitDeletePrompt = () => {
    prompt.mutate(
      { method: "DELETE", query: teamQuery },
      {
        onSuccess: () => {
          toast.success("Prompt deleted");
          addDialog(null);
          navigate(promptsUrl(teamId));
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const openPublishPromptDialog = (prompt: PromptType) => {
    addDialog(
      <PublishPromptDialog
        prompt={prompt}
        onPublishPromptClicked={submitPublishPrompt}
      />,
    );
  };

  const submitPublishPrompt = (data: {
    description: string;
    authors: PromptAuthor[];
    paperRefs: PromptPaperRef[];
  }) => {
    prompt.mutate(
      {
        api: `/api/prompts/${promptId}/publish`,
        method: "POST",
        query: teamQuery,
        data,
      },
      {
        onSuccess: () => {
          toast.success("Prompt published to library");
          addDialog(null);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const openUnpublishPromptDialog = (prompt: PromptType) => {
    addDialog(
      <UnpublishPromptDialog
        prompt={prompt}
        onUnpublishPromptClicked={submitUnpublishPrompt}
      />,
    );
  };

  const submitUnpublishPrompt = () => {
    prompt.mutate(
      {
        api: `/api/prompts/${promptId}/unpublish`,
        method: "POST",
        query: teamQuery,
      },
      {
        onSuccess: () => {
          toast.success("Prompt unpublished");
          addDialog(null);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const breadcrumbs = [
    { text: "Prompts", link: promptsUrl(teamId) },
    { text: prompt.data.name },
  ];

  return (
    <Prompt
      prompt={prompt.data}
      promptVersions={promptVersions.data}
      version={Number(version)}
      breadcrumbs={breadcrumbs}
      canDelete={PromptAuthorization.canDelete(user, prompt.data)}
      canPublish={PromptLibraryAuthorization.canPublish(user)}
      onCreatePromptVersionClicked={submitCreatePromptVersion}
      onEditPromptButtonClicked={openEditPromptDialog}
      onDeletePromptButtonClicked={openDeletePromptDialog}
      onPublishPromptButtonClicked={openPublishPromptDialog}
      onUnpublishPromptButtonClicked={openUnpublishPromptDialog}
    />
  );
}
