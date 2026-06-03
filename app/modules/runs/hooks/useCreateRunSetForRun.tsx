import { useEffect } from "react";
import { useFetcher, useNavigate } from "react-router";
import { toast } from "sonner";
import addDialog from "~/modules/dialogs/addDialog";
import CreateRunSetForRunDialog from "~/modules/runs/components/createRunSetForRunDialog";

export function useCreateRunSetForRun({
  teamId,
  projectId,
}: {
  teamId: string;
  projectId: string;
}) {
  const fetcher = useFetcher();
  const navigate = useNavigate();

  useEffect(() => {
    if (fetcher.state !== "idle") return;
    if (!fetcher.data || !("success" in fetcher.data)) return;

    if (fetcher.data.intent === "CREATE_RUN_SET") {
      toast.success("Run set created");
      navigate(fetcher.data.data.redirectTo);
    }
  }, [fetcher.state, fetcher.data, navigate]);

  const submitCreateRunSet = (name: string, runId: string) => {
    fetcher.submit(
      JSON.stringify({
        intent: "CREATE_RUN_SET",
        payload: { name },
      }),
      {
        method: "POST",
        encType: "application/json",
        action: `/teams/${teamId}/projects/${projectId}/runs/${runId}/add-to-run-set`,
      },
    );
  };

  const openCreateRunSetDialog = (runId: string) => {
    addDialog(
      <CreateRunSetForRunDialog
        onCreateRunSetClicked={(name: string) =>
          submitCreateRunSet(name, runId)
        }
      />,
    );
  };

  return {
    openCreateRunSetDialog,
    isCreating: fetcher.state !== "idle",
  };
}
