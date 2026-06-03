import { useEffect } from "react";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import addDialog from "~/modules/dialogs/addDialog";
import { projectRunUrl } from "~/modules/projects/helpers/projectUrls";
import DeleteRunDialog from "~/modules/runs/components/deleteRunDialog";
import EditRunDialog from "~/modules/runs/components/editRunDialog";
import type { Run } from "~/modules/runs/runs.types";

interface UseRunActionsOptions {
  teamId: string;
  projectId: string;
  onUpdateSuccess?: () => void;
  onDeleteSuccess?: () => void;
}

export function useRunActions({
  teamId,
  projectId,
  onUpdateSuccess,
  onDeleteSuccess,
}: UseRunActionsOptions) {
  const fetcher = useFetcher();

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      if (fetcher.data.success && fetcher.data.intent === "UPDATE_RUN") {
        toast.success("Updated run");
        addDialog(null);
        onUpdateSuccess?.();
      } else if (fetcher.data.success && fetcher.data.intent === "DELETE_RUN") {
        toast.success("Deleted run");
        addDialog(null);
        onDeleteSuccess?.();
      } else if (fetcher.data.errors) {
        toast.error(fetcher.data.errors.general || "An error occurred");
      }
    }
  }, [fetcher.state, fetcher.data, onDeleteSuccess, onUpdateSuccess]);

  const submitEditRun = (run: Run) => {
    fetcher.submit(
      JSON.stringify({
        intent: "UPDATE_RUN",
        payload: { name: run.name },
      }),
      {
        method: "PUT",
        encType: "application/json",
        action: projectRunUrl(teamId, projectId, run._id),
      },
    );
  };

  const submitDeleteRun = (runId: string) => {
    fetcher.submit(
      JSON.stringify({
        intent: "DELETE_RUN",
        payload: {},
      }),
      {
        method: "DELETE",
        encType: "application/json",
        action: projectRunUrl(teamId, projectId, runId),
      },
    );
  };

  const openEditRunDialog = (run: Run) => {
    addDialog(<EditRunDialog run={run} onEditRunClicked={submitEditRun} />);
  };

  const openDeleteRunDialog = (run: Run) => {
    addDialog(
      <DeleteRunDialog run={run} onDeleteRunClicked={submitDeleteRun} />,
    );
  };

  return {
    openEditRunDialog,
    openDeleteRunDialog,
    isSubmitting: fetcher.state !== "idle",
  };
}
