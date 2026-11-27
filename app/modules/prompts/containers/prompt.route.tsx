import { useContext } from "react";
import { data, redirect, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { AuthenticationContext } from "~/modules/authentication/authentication.context";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import useCache from "~/modules/cache/hooks/useCache";
import addDialog from "~/modules/dialogs/addDialog";
import PromptAuthorization from "~/modules/prompts/authorization";
import PromptLibraryAuthorization from "~/modules/prompts/promptLibraryAuthorization";
import { RunService } from "~/modules/runs/run";
import DeletePromptDialog from "../components/deletePromptDialog";
import EditPromptDialog from "../components/editPromptDialog";
import Prompt from "../components/prompt";
import PublishPromptDialog from "../components/publishPromptDialog";
import UnpublishPromptDialog from "../components/unpublishPromptDialog";
import { PromptPublishedError } from "../errors/promptPublishedError";
import { PublishError } from "../errors/publishError";
import { cleanAuthors, cleanPaperRefs } from "../helpers/cleanLibraryMetadata";
import { promptsUrl } from "../helpers/promptUrls";
import { PromptService } from "../prompt";
import type {
  PromptAuthor,
  PromptPaperRef,
  Prompt as PromptType,
} from "../prompts.types";
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
  return {};
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
    case "PUBLISH_PROMPT": {
      if (!PromptLibraryAuthorization.canPublish(user)) {
        return data(
          {
            errors: {
              general: "You do not have permission to publish prompts.",
            },
          },
          { status: 403 },
        );
      }

      const { description, authors, paperRefs } = payload;

      if (typeof description !== "string" || !description.trim()) {
        return data(
          { errors: { general: "Description is required" } },
          { status: 400 },
        );
      }

      try {
        const published = await PromptService.publish(entityId, {
          description: description.trim(),
          authors: cleanAuthors(authors),
          paperRefs: cleanPaperRefs(paperRefs),
        });

        return data({
          success: true,
          intent: "PUBLISH_PROMPT",
          data: published,
        });
      } catch (error) {
        if (error instanceof PublishError) {
          return data({ errors: { general: error.message } }, { status: 400 });
        }
        throw error;
      }
    }
    case "UNPUBLISH_PROMPT": {
      if (!PromptLibraryAuthorization.canPublish(user)) {
        return data(
          {
            errors: {
              general: "You do not have permission to unpublish prompts.",
            },
          },
          { status: 403 },
        );
      }

      const unpublished = await PromptService.unpublish(entityId);
      return data({
        success: true,
        intent: "UNPUBLISH_PROMPT",
        data: unpublished,
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
