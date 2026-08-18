import find from "lodash/find";
import {
  data,
  redirect,
  useFetcher,
  useNavigate,
  useSearchParams,
} from "react-router";
import Signup from "~/modules/authentication/components/signup";
import getSessionUser from "~/modules/authentication/helpers/getSessionUser";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import getInitialCreditsAmount from "~/modules/billing/helpers/getInitialCreditsAmount.server";
import sessionStorage from "../../../../sessionStorage";
import JoinTeam from "../components/joinTeam";
import getTeamInviteStatus from "../helpers/getTeamInviteStatus";
import consumeTeamInvite from "../services/consumeTeamInvite.server";
import { TeamService } from "../team";
import { TeamInviteService } from "../teamInvites";
import type { Route } from "./+types/join.route";

const STATUS_TO_ERROR: Record<string, string> = {
  expired: "EXPIRED_INVITE",
  full: "INVITE_FULL",
  revoked: "INVITE_REVOKED",
};

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await getSessionUser({ request });
  const initialCredits = getInitialCreditsAmount();
  const invite = await TeamInviteService.findOne({ slug: params.slug });

  if (!invite) {
    if (!user) throw redirect("/signup?error=EXPIRED_INVITE");
    return {
      isAuthenticated: true,
      slug: params.slug,
      status: "not_found",
      teamName: null,
      initialCredits,
    };
  }

  const inviteStatus = getTeamInviteStatus(invite);

  if (!user) {
    if (inviteStatus !== "active") {
      const errorCode = STATUS_TO_ERROR[inviteStatus] ?? "EXPIRED_INVITE";
      throw redirect(`/signup?error=${errorCode}`);
    }
    // The team name stays behind the login wall — an unauthenticated visitor
    // holding only a slug learns nothing about the team.
    return {
      isAuthenticated: false,
      slug: invite.slug,
      status: "active",
      teamName: null,
      initialCredits,
    };
  }

  const isMember = !!find(user.teams, (t) => t.team === invite.team);
  const team = await TeamService.findById(invite.team);

  return {
    isAuthenticated: true,
    slug: invite.slug,
    status: isMember ? "already_member" : inviteStatus,
    teamName: team?.name ?? null,
    initialCredits,
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireAuth({ request });

  const payload = await request.json();
  if (payload.intent !== "JOIN_TEAM") {
    return data({ errors: { general: "Invalid intent" } }, { status: 400 });
  }

  const invite = await TeamInviteService.findOne({ slug: params.slug });
  if (!invite) {
    return data({ ok: false, error: "not_found" }, { status: 404 });
  }

  const result = await consumeTeamInvite({ inviteId: invite._id, user });

  if (result.status === "success" || result.status === "already_member") {
    const team = await TeamService.findById(invite.team);
    const teamName = team?.name ?? "the team";
    const session = await sessionStorage.getSession(
      request.headers.get("cookie"),
    );
    session.flash(
      "flashToast",
      result.status === "success"
        ? `You've joined ${teamName}`
        : `You're already a member of ${teamName}`,
    );
    throw redirect("/", {
      headers: { "Set-Cookie": await sessionStorage.commitSession(session) },
    });
  }

  return data({ ok: false, error: result.status }, { status: 410 });
}

export default function JoinRoute({
  params,
  loaderData,
}: Route.ComponentProps) {
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const submitJoinTeam = () => {
    fetcher.submit(JSON.stringify({ intent: "JOIN_TEAM" }), {
      method: "POST",
      encType: "application/json",
    });
  };

  const onSignupWithGithubClicked = () => {
    fetcher.submit(
      { provider: "github", returnTo: `/join/${params.slug}` },
      {
        action: "/api/authentication",
        method: "post",
        encType: "application/json",
      },
    );
  };

  if (loaderData.isAuthenticated) {
    const fetcherError = !fetcher.data?.ok ? fetcher.data?.error : null;
    return (
      <JoinTeam
        teamName={loaderData.teamName}
        status={fetcherError ?? loaderData.status}
        isSubmitting={fetcher.state !== "idle"}
        onJoinTeamClicked={submitJoinTeam}
        onGoHomeClicked={() => navigate("/")}
      />
    );
  }

  return (
    <Signup
      onSignupWithGithubClicked={onSignupWithGithubClicked}
      initialCredits={loaderData.initialCredits}
      errorType={searchParams.get("error")}
      title="National Tutoring Observatory"
      description="You've been invited to the National Tutoring Observatory annotation tool."
      showCredits={false}
    />
  );
}
