import { useEffect } from "react";
import { data, redirect, useFetcher, useLoaderData } from "react-router";
import { toast } from "sonner";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import addDialog from "~/modules/dialogs/addDialog";
import { UserService } from "~/modules/users/user";
import TeamAuthorization from "../authorization";
import ConfirmRevokeInviteDialog from "../components/confirmRevokeInviteDialog";
import TeamInviteLink from "../components/teamInviteLink";
import { TeamInviteService } from "../teamInvites";
import type { Route } from "./+types/teamInviteLink.route";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireAuth({ request });
  if (!TeamAuthorization.Invites.canView(user, params.teamId)) {
    return redirect(`/teams/${params.teamId}`);
  }

  const invite = await TeamInviteService.findOne({
    _id: params.inviteLinkId,
    team: params.teamId,
  });
  if (!invite) return redirect(`/teams/${params.teamId}/invite-links`);

  const signups = await UserService.find({
    match: { "teams.viaTeamInvite": invite._id },
  });
  const creator = await UserService.findById(invite.createdBy);
  const creatorLabel = creator?.name || creator?.username || "Unknown";

  return { invite, signups, creatorLabel };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireAuth({ request });

  if (!TeamAuthorization.Invites.canRevoke(user, params.teamId)) {
    return data({ errors: { general: "Forbidden" } }, { status: 403 });
  }

  const { intent } = await request.json();
  if (intent !== "REVOKE_TEAM_INVITE_LINK") {
    return data({ errors: { intent: "Invalid intent" } }, { status: 400 });
  }

  const invite = await TeamInviteService.findOne({
    _id: params.inviteLinkId,
    team: params.teamId,
  });
  if (!invite) {
    return data({ errors: { general: "Not found" } }, { status: 404 });
  }

  const updated = await TeamInviteService.revokeById(invite._id, user._id);
  return data({ success: true, invite: updated });
}

export default function TeamInviteLinkRoute() {
  const { invite, signups, creatorLabel } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    if ("success" in fetcher.data && fetcher.data.success) {
      toast.success("Invite link revoked");
    }
  }, [fetcher.state, fetcher.data]);

  const onCopyClicked = () => {
    navigator.clipboard.writeText(
      `${window.location.origin}/join/${invite.slug}`,
    );
    toast.success("Link copied");
  };

  const onRevokeClicked = () => {
    addDialog(
      <ConfirmRevokeInviteDialog
        inviteName={invite.name}
        onConfirm={() => {
          fetcher.submit(
            JSON.stringify({ intent: "REVOKE_TEAM_INVITE_LINK" }),
            { method: "POST", encType: "application/json" },
          );
        }}
      />,
    );
  };

  return (
    <TeamInviteLink
      invite={invite}
      signups={signups}
      creatorLabel={creatorLabel}
      onCopyClicked={onCopyClicked}
      onRevokeClicked={onRevokeClicked}
    />
  );
}
