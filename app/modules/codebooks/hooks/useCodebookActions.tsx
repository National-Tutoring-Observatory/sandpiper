import { useEffect } from "react";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import getReferenceId from "~/helpers/getReferenceId";
import type { Codebook } from "~/modules/codebooks/codebooks.types";
import DeleteCodebookDialog from "~/modules/codebooks/components/deleteCodebookDialog";
import EditCodebookDialog from "~/modules/codebooks/components/editCodebookDialog";
import { codebookUrl } from "~/modules/codebooks/helpers/codebookUrls";
import addDialog from "~/modules/dialogs/addDialog";

interface UseCodebookActionsOptions {
  onEditSuccess?: () => void;
  onDeleteSuccess?: () => void;
}

export function useCodebookActions({
  onEditSuccess,
  onDeleteSuccess,
}: UseCodebookActionsOptions = {}) {
  const editFetcher = useFetcher();
  const deleteFetcher = useFetcher();

  useEffect(() => {
    if (editFetcher.state === "idle" && editFetcher.data) {
      if (
        editFetcher.data.success &&
        editFetcher.data.intent === "UPDATE_CODEBOOK"
      ) {
        toast.success("Codebook updated");
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
        deleteFetcher.data.intent === "DELETE_CODEBOOK"
      ) {
        toast.success("Codebook deleted");
        addDialog(null);
        onDeleteSuccess?.();
      } else if (deleteFetcher.data.errors) {
        toast.error(deleteFetcher.data.errors.general || "An error occurred");
      }
    }
  }, [deleteFetcher.state, deleteFetcher.data]);

  const submitEditCodebook = (codebook: Codebook) => {
    editFetcher.submit(
      JSON.stringify({
        intent: "UPDATE_CODEBOOK",
        entityId: codebook._id,
        payload: { name: codebook.name, description: codebook.description },
      }),
      {
        method: "PUT",
        encType: "application/json",
        action: codebookUrl(getReferenceId(codebook.team), codebook._id),
      },
    );
  };

  const submitDeleteCodebook = (codebook: Codebook) => {
    deleteFetcher.submit(
      JSON.stringify({
        intent: "DELETE_CODEBOOK",
        entityId: codebook._id,
      }),
      {
        method: "POST",
        encType: "application/json",
        action: codebookUrl(getReferenceId(codebook.team), codebook._id),
      },
    );
  };

  const openEditCodebookDialog = (codebook: Codebook) => {
    addDialog(
      <EditCodebookDialog
        codebook={codebook}
        onEditCodebookClicked={submitEditCodebook}
        isSubmitting={editFetcher.state === "submitting"}
      />,
    );
  };

  const openDeleteCodebookDialog = (codebook: Codebook) => {
    addDialog(
      <DeleteCodebookDialog
        codebook={codebook}
        onDeleteCodebookClicked={() => submitDeleteCodebook(codebook)}
        isSubmitting={deleteFetcher.state === "submitting"}
      />,
    );
  };

  return {
    openEditCodebookDialog,
    openDeleteCodebookDialog,
    isEditing: editFetcher.state !== "idle",
    isDeleting: deleteFetcher.state !== "idle",
  };
}
