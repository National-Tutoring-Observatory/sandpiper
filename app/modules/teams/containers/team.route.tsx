import { useEffect } from "react";
import { redirect, useFetcher } from "react-router";
import { toast } from "sonner";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import addDialog from "~/modules/dialogs/addDialog";
import TeamAuthorization from "../authorization";
import EditTeamDialog from "../components/editTeamDialog";
import TeamComponent from "../components/team";
import { TeamService } from "../team";
import type { Team } from "../teams.types";
import type { Route } from "./+types/team.route";

export async function loader({ request, params }: Route.LoaderArgs) {
  const userSession = await requireAuth({ request });

  if (!TeamAuthorization.canView(userSession, params.id)) {
    return redirect("/");
  }

  const team = await TeamService.findById(params.id);
  if (!team) {
    return redirect("/teams");
  }
  return { team };
}

export function HydrateFallback() {
  return <div>Loading...</div>;
}

export default function TeamRoute({
  loaderData,
}: {
  loaderData: {
    team: Team;
  };
}) {
  const { team } = loaderData;

  const fetcher = useFetcher();

  const onEditTeamButtonClicked = (teamData: Team) => {
    addDialog(
      <EditTeamDialog
        team={teamData}
        onEditTeamClicked={(teamData: Team) => {
          fetcher.submit(
            JSON.stringify({
              intent: "UPDATE_TEAM",
              entityId: teamData._id,
              payload: { name: teamData.name },
            }),
            { method: "PUT", encType: "application/json", action: `/teams` },
          );
        }}
      />,
    );
  };

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      toast.success("Updated team");
    }
  }, [fetcher.state, fetcher.data]);

  const breadcrumbs = [{ text: "Teams", link: `/teams` }, { text: team.name }];

  return (
    <TeamComponent
      team={team}
      breadcrumbs={breadcrumbs}
      onEditTeamButtonClicked={onEditTeamButtonClicked}
    />
  );
}
