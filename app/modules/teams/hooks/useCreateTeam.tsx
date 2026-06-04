import { useEffect } from "react";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import useActiveTeam from "~/modules/app/hooks/useActiveTeam";
import addDialog from "~/modules/dialogs/addDialog";
import CreateTeamDialog from "../components/createTeamDialog";

type CreateTeamResponse = {
  success?: boolean;
  intent?: string;
  data?: { _id: string };
  errors?: { general?: string };
};

export default function useCreateTeam(): () => void {
  const fetcher = useFetcher<CreateTeamResponse>();
  const { switchActiveTeam } = useActiveTeam();

  useEffect(() => {
    if (fetcher.state !== "idle") return;
    if (!fetcher.data) return;
    if (
      fetcher.data.success &&
      fetcher.data.intent === "CREATE_TEAM" &&
      fetcher.data.data
    ) {
      toast.success("Team created");
      switchActiveTeam(fetcher.data.data._id);
    } else if (fetcher.data.errors) {
      toast.error(fetcher.data.errors.general || "Could not create team");
    }
  }, [fetcher.state, fetcher.data, switchActiveTeam]);

  const submit = (name: string) => {
    fetcher.submit(
      JSON.stringify({ intent: "CREATE_TEAM", payload: { name } }),
      {
        method: "POST",
        action: "/api/teams",
        encType: "application/json",
      },
    );
  };

  return () => {
    addDialog(<CreateTeamDialog onCreateNewTeamClicked={submit} />);
  };
}
