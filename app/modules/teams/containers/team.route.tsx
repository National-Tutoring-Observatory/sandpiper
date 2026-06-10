import { useEffect } from "react";
import { data, redirect, useFetcher } from "react-router";
import { toast } from "sonner";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import addDialog from "~/modules/dialogs/addDialog";
import TeamAuthorization from "../authorization";
import EditTeamDialog from "../components/editTeamDialog";
import TeamComponent from "../components/team";
import { adminTeamsUrl } from "../helpers/teamUrls";
import { TeamService } from "../team";
import type { Team } from "../teams.types";
import type { Route } from "./+types/team.route";

export async function loader({ request, params }: Route.LoaderArgs) {
  const userSession = await requireAuth({ request });

  if (!TeamAuthorization.canView(userSession, params.teamId)) {
    return redirect("/");
  }

  const team = await TeamService.findById(params.teamId);
  if (!team) {
    return redirect(adminTeamsUrl());
  }
  return { team };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireAuth({ request });
  const { intent, payload = {} } = await request.json();

  switch (intent) {
    case "UPDATE_TEAM": {
      if (!TeamAuthorization.canUpdate(user, params.teamId)) {
        return data(
          {
            errors: {
              general:
                "Insufficient permissions. Only team admins can update teams.",
            },
          },
          { status: 403 },
        );
      }
      const { name } = payload;
      if (typeof name !== "string") {
        return data(
          {
            errors: { general: "Team name is required and must be a string." },
          },
          { status: 400 },
        );
      }
      const updated = await TeamService.updateById(params.teamId, { name });
      return data({ success: true, intent: "UPDATE_TEAM", data: updated });
    }
    default:
      return data({ errors: { general: "Invalid intent" } }, { status: 400 });
  }
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
              payload: { name: teamData.name },
            }),
            { method: "PUT", encType: "application/json" },
          );
        }}
      />,
    );
  };

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    if (fetcher.data.success) {
      toast.success("Updated team");
      addDialog(null);
    } else if (fetcher.data.errors) {
      toast.error(fetcher.data.errors.general || "An error occurred");
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <TeamComponent
      team={team}
      onEditTeamButtonClicked={onEditTeamButtonClicked}
    />
  );
}
