import { useEffect } from "react";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import getReferenceId from "~/helpers/getReferenceId";
import addDialog from "~/modules/dialogs/addDialog";
import DeletePromptDialog from "~/modules/prompts/components/deletePromptDialog";
import EditPromptDialog from "~/modules/prompts/components/editPromptDialog";
import PublishPromptDialog from "~/modules/prompts/components/publishPromptDialog";
import UnpublishPromptDialog from "~/modules/prompts/components/unpublishPromptDialog";
import { promptsUrl } from "~/modules/prompts/helpers/promptUrls";
import type {
  Prompt,
  PromptAuthor,
  PromptPaperRef,
} from "~/modules/prompts/prompts.types";

interface UsePromptActionsOptions {
  onEditSuccess?: () => void;
  onDeleteSuccess?: () => void;
  onPublishSuccess?: () => void;
  onUnpublishSuccess?: () => void;
}

export function usePromptActions({
  onEditSuccess,
  onDeleteSuccess,
  onPublishSuccess,
  onUnpublishSuccess,
}: UsePromptActionsOptions = {}) {
  const editFetcher = useFetcher();
  const deleteFetcher = useFetcher();
  const publishFetcher = useFetcher();
  const unpublishFetcher = useFetcher();

  useEffect(() => {
    if (editFetcher.state === "idle" && editFetcher.data) {
      if (
        editFetcher.data.success &&
        editFetcher.data.intent === "UPDATE_PROMPT"
      ) {
        toast.success("Prompt updated");
        addDialog(null);
        onEditSuccess?.();
      } else if (editFetcher.data.errors) {
        toast.error(editFetcher.data.errors.general || "An error occurred");
      }
    }
  }, [editFetcher.state, editFetcher.data]);

  useEffect(() => {
    if (deleteFetcher.state === "idle" && deleteFetcher.data) {
      if (
        deleteFetcher.data.success &&
        deleteFetcher.data.intent === "DELETE_PROMPT"
      ) {
        toast.success("Prompt deleted");
        addDialog(null);
        onDeleteSuccess?.();
      } else if (deleteFetcher.data.errors) {
        toast.error(deleteFetcher.data.errors.general || "An error occurred");
      }
    }
  }, [deleteFetcher.state, deleteFetcher.data]);

  useEffect(() => {
    if (publishFetcher.state === "idle" && publishFetcher.data) {
      if (
        publishFetcher.data.success &&
        publishFetcher.data.intent === "PUBLISH_PROMPT"
      ) {
        toast.success("Prompt published to library");
        addDialog(null);
        onPublishSuccess?.();
      } else if (publishFetcher.data.errors) {
        toast.error(publishFetcher.data.errors.general || "An error occurred");
      }
    }
  }, [publishFetcher.state, publishFetcher.data]);

  useEffect(() => {
    if (unpublishFetcher.state === "idle" && unpublishFetcher.data) {
      if (
        unpublishFetcher.data.success &&
        unpublishFetcher.data.intent === "UNPUBLISH_PROMPT"
      ) {
        toast.success("Prompt unpublished");
        addDialog(null);
        onUnpublishSuccess?.();
      } else if (unpublishFetcher.data.errors) {
        toast.error(
          unpublishFetcher.data.errors.general || "An error occurred",
        );
      }
    }
  }, [unpublishFetcher.state, unpublishFetcher.data]);

  const submitEditPrompt = (prompt: Prompt) => {
    editFetcher.submit(
      JSON.stringify({
        intent: "UPDATE_PROMPT",
        entityId: prompt._id,
        payload: { name: prompt.name },
      }),
      {
        method: "PUT",
        encType: "application/json",
        action: promptsUrl(getReferenceId(prompt.team), prompt._id),
      },
    );
  };

  const submitDeletePrompt = (prompt: Prompt) => {
    deleteFetcher.submit(
      JSON.stringify({
        intent: "DELETE_PROMPT",
        entityId: prompt._id,
      }),
      {
        method: "POST",
        encType: "application/json",
        action: promptsUrl(getReferenceId(prompt.team), prompt._id),
      },
    );
  };

  const submitPublishPrompt = (
    prompt: Prompt,
    payload: {
      description: string;
      authors: PromptAuthor[];
      paperRefs: PromptPaperRef[];
    },
  ) => {
    publishFetcher.submit(
      JSON.stringify({
        intent: "PUBLISH_PROMPT",
        entityId: prompt._id,
        payload,
      }),
      {
        method: "POST",
        encType: "application/json",
        action: promptsUrl(getReferenceId(prompt.team), prompt._id),
      },
    );
  };

  const submitUnpublishPrompt = (prompt: Prompt) => {
    unpublishFetcher.submit(
      JSON.stringify({
        intent: "UNPUBLISH_PROMPT",
        entityId: prompt._id,
      }),
      {
        method: "POST",
        encType: "application/json",
        action: promptsUrl(getReferenceId(prompt.team), prompt._id),
      },
    );
  };

  const openEditPromptDialog = (prompt: Prompt) => {
    addDialog(
      <EditPromptDialog
        prompt={prompt}
        onEditPromptClicked={submitEditPrompt}
        isSubmitting={editFetcher.state === "submitting"}
      />,
    );
  };

  const openDeletePromptDialog = (prompt: Prompt) => {
    addDialog(
      <DeletePromptDialog
        prompt={prompt}
        onDeletePromptClicked={() => submitDeletePrompt(prompt)}
        isSubmitting={deleteFetcher.state === "submitting"}
      />,
    );
  };

  const openPublishPromptDialog = (prompt: Prompt) => {
    addDialog(
      <PublishPromptDialog
        prompt={prompt}
        onPublishPromptClicked={(payload) =>
          submitPublishPrompt(prompt, payload)
        }
        isSubmitting={publishFetcher.state === "submitting"}
      />,
    );
  };

  const openUnpublishPromptDialog = (prompt: Prompt) => {
    addDialog(
      <UnpublishPromptDialog
        prompt={prompt}
        onUnpublishPromptClicked={() => submitUnpublishPrompt(prompt)}
        isSubmitting={unpublishFetcher.state === "submitting"}
      />,
    );
  };

  return {
    openEditPromptDialog,
    openDeletePromptDialog,
    openPublishPromptDialog,
    openUnpublishPromptDialog,
    isEditing: editFetcher.state !== "idle",
    isDeleting: deleteFetcher.state !== "idle",
    isPublishing: publishFetcher.state !== "idle",
    isUnpublishing: unpublishFetcher.state !== "idle",
  };
}
