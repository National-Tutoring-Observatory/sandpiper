import dayjs from "dayjs";
import find from "lodash/find";
import mongoose from "mongoose";
import teamInviteSchema from "~/lib/schemas/teamInvite.schema";
import trackServerEvent from "~/modules/analytics/helpers/trackServerEvent.server";
import getTeamInviteStatus from "~/modules/teams/helpers/getTeamInviteStatus";
import INVITE_LINK_TTL_DAYS from "~/modules/teams/helpers/inviteLink";
import { TeamInviteService } from "~/modules/teams/teamInvites";
import type { TeamInvite } from "~/modules/teams/teamInvites.types";
import { UserService } from "~/modules/users/user";
import type { User } from "~/modules/users/users.types";

const TeamInviteModel =
  mongoose.models.TeamInvite || mongoose.model("TeamInvite", teamInviteSchema);

export type ConsumeStatus =
  | "success"
  | "already_member"
  | "expired"
  | "full"
  | "revoked"
  | "not_found";

export interface ConsumeResult {
  status: ConsumeStatus;
  user?: User;
  invite?: TeamInvite;
}

export default async function consumeTeamInvite({
  inviteId,
  user,
}: {
  inviteId: string;
  user: User;
}): Promise<ConsumeResult> {
  const invite = await TeamInviteService.findById(inviteId);

  if (!invite) return { status: "not_found" };

  // Membership is resolved before invite validity: an existing member must never
  // be turned away by the age of the link that first brought them in (#2461).
  const alreadyInTeam = find(user.teams, (t) => t.team === invite.team);
  if (alreadyInTeam) return { status: "already_member", user, invite };

  const status = getTeamInviteStatus(invite);
  if (status !== "active") return { status };

  const cutoff = dayjs().subtract(INVITE_LINK_TTL_DAYS, "day").toDate();
  const atomicallyUpdated = await TeamInviteModel.findOneAndUpdate(
    {
      _id: inviteId,
      revokedAt: null,
      createdAt: { $gt: cutoff },
      $expr: { $lt: ["$usedCount", "$maxUses"] },
    },
    { $inc: { usedCount: 1 } },
    { new: true },
  );

  if (!atomicallyUpdated) {
    const current = await TeamInviteService.findById(inviteId);
    if (!current) return { status: "not_found" };
    const currentStatus = getTeamInviteStatus(current);
    // "active" shouldn't happen here (atomic match failed but invite appears active);
    // treat as "full" since usedCount reaching maxUses is the most likely race.
    if (currentStatus === "active") return { status: "full" };
    return { status: currentStatus };
  }

  const updatedTeams = [
    ...user.teams,
    { team: invite.team, role: "MEMBER" as const, viaTeamInvite: invite._id },
  ];
  const updated = (await UserService.updateById(user._id, {
    teams: updatedTeams,
  })) as User;

  trackServerEvent({
    name: "team_invite_signup",
    userId: updated._id,
    params: {
      team_invite_id: invite._id,
      team_id: invite.team,
    },
  });

  return { status: "success", user: updated, invite };
}
