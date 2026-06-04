import { data } from "react-router";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import { TeamBillingService } from "~/modules/billing/teamBilling";
import TeamAuthorization from "../authorization";
import { serializeActiveTeamCookie } from "../helpers/activeTeamCookie";
import { TeamService } from "../team";
import type { Route } from "./+types/createTeam.route";

export async function action({ request }: Route.ActionArgs) {
  const user = await requireAuth({ request });

  const { intent, payload = {} } = await request.json();

  if (intent !== "CREATE_TEAM") {
    return data({ errors: { general: "Invalid intent" } }, { status: 400 });
  }

  if (!TeamAuthorization.canCreate(user)) {
    return data(
      { errors: { general: "Insufficient permissions." } },
      { status: 403 },
    );
  }

  const { name } = payload;

  if (typeof name !== "string" || name.trim().length === 0) {
    return data(
      { errors: { general: "Team name is required and must be a string." } },
      { status: 400 },
    );
  }

  const team = await TeamService.createForUser(name.trim(), user._id);
  await TeamBillingService.setupTeamBilling(team._id);

  return data(
    { success: true, intent: "CREATE_TEAM", data: team },
    { headers: { "Set-Cookie": serializeActiveTeamCookie(team._id) } },
  );
}
