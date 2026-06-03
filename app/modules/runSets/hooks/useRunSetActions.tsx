import { useEffect } from "react";
import { useFetcher, useNavigate } from "react-router";
import { toast } from "sonner";
import addDialog from "~/modules/dialogs/addDialog";
import {
  projectRunSetUrl,
  projectRunSetsUrl,
} from "~/modules/projects/helpers/projectUrls";
import DeleteRunSetDialog from "~/modules/runSets/components/deleteRunSetDialog";
import DuplicateRunSetDialog from "~/modules/runSets/components/duplicateRunSetDialog";
import EditRunSetDialog from "~/modules/runSets/components/editRunSetDialog";
import type { RunSet } from "~/modules/runSets/runSets.types";

interface UseRunSetActionsOptions {
  teamId: string;
  projectId: string;
  onEditSuccess?: () => void;
  onDeleteSuccess?: () => void;
  onDuplicateSuccess?: (runSet: RunSet) => void;
}

export function useRunSetActions({
  teamId,
  projectId,
  onEditSuccess,
  onDeleteSuccess,
  onDuplicateSuccess,
}: UseRunSetActionsOptions) {
  const navigate = useNavigate();
  const editFetcher = useFetcher();
  const deleteFetcher = useFetcher();
  const duplicateFetcher = useFetcher();

  const actionUrl = projectRunSetsUrl(teamId, projectId);

  useEffect(() => {
    if (editFetcher.state === "idle" && editFetcher.data) {
      toast.success("Run set updated");
      addDialog(null);
      onEditSuccess?.();
    }
  }, [editFetcher.state, editFetcher.data]);

  useEffect(() => {
    if (deleteFetcher.state === "idle" && deleteFetcher.data) {
      if (deleteFetcher.data.intent === "DELETE_RUN_SET") {
        toast.success("Run set deleted");
        addDialog(null);
        onDeleteSuccess?.();
      }
    }
  }, [deleteFetcher.state, deleteFetcher.data]);

  useEffect(() => {
    if (duplicateFetcher.state === "idle" && duplicateFetcher.data) {
      if (duplicateFetcher.data.intent === "DUPLICATE_RUN_SET") {
        const newRunSet = duplicateFetcher.data as RunSet;
        toast.success("Run set duplicated");
        addDialog(null);
        if (onDuplicateSuccess) {
          onDuplicateSuccess(newRunSet);
        } else {
          navigate(projectRunSetUrl(teamId, projectId, newRunSet._id));
        }
      }
    }
  }, [
    duplicateFetcher.state,
    duplicateFetcher.data,
    navigate,
    teamId,
    projectId,
  ]);

  const submitEditRunSet = (runSet: RunSet) => {
    editFetcher.submit(
      JSON.stringify({
        intent: "UPDATE_RUN_SET",
        entityId: runSet._id,
        payload: { name: runSet.name },
      }),
      { method: "PUT", encType: "application/json", action: actionUrl },
    );
  };

  const submitDeleteRunSet = (runSetId: string) => {
    deleteFetcher.submit(
      JSON.stringify({ intent: "DELETE_RUN_SET", entityId: runSetId }),
      { method: "DELETE", encType: "application/json", action: actionUrl },
    );
  };

  const submitDuplicateRunSet = ({
    name,
    runSetId,
  }: {
    name: string;
    runSetId: string;
  }) => {
    duplicateFetcher.submit(
      JSON.stringify({
        intent: "DUPLICATE_RUN_SET",
        entityId: runSetId,
        payload: { name },
      }),
      { method: "POST", encType: "application/json", action: actionUrl },
    );
  };

  const openEditRunSetDialog = (runSet: RunSet) => {
    addDialog(
      <EditRunSetDialog
        runSet={runSet}
        onEditRunSetClicked={submitEditRunSet}
      />,
    );
  };

  const openDeleteRunSetDialog = (runSet: RunSet) => {
    addDialog(
      <DeleteRunSetDialog
        runSet={runSet}
        onDeleteRunSetClicked={submitDeleteRunSet}
      />,
    );
  };

  const openDuplicateRunSetDialog = (runSet: RunSet) => {
    addDialog(
      <DuplicateRunSetDialog
        runSet={runSet}
        onDuplicateNewRunSetClicked={submitDuplicateRunSet}
      />,
    );
  };

  return {
    openEditRunSetDialog,
    openDeleteRunSetDialog,
    openDuplicateRunSetDialog,
    isEditing: editFetcher.state !== "idle",
    isDeleting: deleteFetcher.state !== "idle",
    isDuplicating: duplicateFetcher.state !== "idle",
  };
}
