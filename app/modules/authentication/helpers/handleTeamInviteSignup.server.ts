import { redirect } from "react-router";
import consumeTeamInvite from "~/modules/teams/services/consumeTeamInvite.server";
import sessionStorage from "../../../../sessionStorage";
import extractPrimaryEmail from "./extractPrimaryEmail";

export default async function handleTeamInviteSignup({
  teamInviteId,
  githubUser,
  emails,
  request,
}: {
  teamInviteId: string;
  githubUser: { id: number; login: string; name?: string };
  emails: unknown;
  request: Request;
}) {
  const primaryEmail = extractPrimaryEmail(emails);
  if (!primaryEmail) throw redirect("/signup?error=NO_EMAIL");

  const result = await consumeTeamInvite({
    inviteId: teamInviteId,
    githubUser,
    primaryEmail,
  });

  if (result.status === "expired")
    throw redirect("/signup?error=EXPIRED_INVITE");
  if (result.status === "full") throw redirect("/signup?error=INVITE_FULL");
  if (result.status === "revoked")
    throw redirect("/signup?error=INVITE_REVOKED");
  if (result.status === "not_found")
    throw redirect("/signup?error=EXPIRED_INVITE");

  if (result.status === "already_member") {
    const session = await sessionStorage.getSession(
      request.headers.get("cookie"),
    );
    session.set("user", result.user);
    session.flash("flashToast", "You're already a member of this team");
    const cookie = await sessionStorage.commitSession(session);
    throw redirect("/", { headers: { "Set-Cookie": cookie } });
  }

  return result.user!;
}
