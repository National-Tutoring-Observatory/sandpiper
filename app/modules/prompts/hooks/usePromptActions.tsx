import { useEffect } from "react";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import addDialog from "~/modules/dialogs/addDialog";
import DeletePromptDialog from "~/modules/prompts/components/deletePromptDialog";
import EditPromptDialog from "~/modules/prompts/components/editPromptDialog";
import type { Prompt } from "~/modules/prompts/prompts.types";

interface UsePromptActionsOptions {
  onEditSuccess?: () => void;
  onDeleteSuccess?: () => void;
}

export function usePromptActions({
  onEditSuccess,
  onDeleteSuccess,
}: UsePromptActionsOptions = {}) {
  const editFetcher = useFetcher();
  const deleteFetcher = useFetcher();

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

  const getPromptTeamId = (prompt: Prompt | { team: unknown }): string => {
    const team = (prompt as { team: unknown }).team;
    if (typeof team === "string") return team;
    if (team && typeof team === "object" && "_id" in team) {
      return (team as { _id: string })._id;
    }
    throw new Error("Prompt is missing a team reference");
  };

  const submitEditPrompt = (prompt: Prompt) => {
    const teamId = getPromptTeamId(prompt);
    editFetcher.submit(
      JSON.stringify({
        intent: "UPDATE_PROMPT",
        entityId: prompt._id,
        payload: { name: prompt.name },
      }),
      {
        method: "PUT",
        encType: "application/json",
        action: `/teams/${teamId}/prompts/${prompt._id}`,
      },
    );
  };

  const submitDeletePrompt = (promptId: string, teamId: string) => {
    deleteFetcher.submit(
      JSON.stringify({
        intent: "DELETE_PROMPT",
        entityId: promptId,
      }),
      {
        method: "POST",
        encType: "application/json",
        action: `/teams/${teamId}/prompts/${promptId}`,
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
    const teamId = getPromptTeamId(prompt);
    addDialog(
      <DeletePromptDialog
        prompt={prompt}
        onDeletePromptClicked={(promptId: string) =>
          submitDeletePrompt(promptId, teamId)
        }
        isSubmitting={deleteFetcher.state === "submitting"}
      />,
    );
  };

  return {
    openEditPromptDialog,
    openDeletePromptDialog,
    isEditing: editFetcher.state !== "idle",
    isDeleting: deleteFetcher.state !== "idle",
  };
}
