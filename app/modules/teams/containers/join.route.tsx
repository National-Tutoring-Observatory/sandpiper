import { redirect, useFetcher, useSearchParams } from "react-router";
import Signup from "~/modules/authentication/components/signup";
import getInitialCreditsAmount from "~/modules/billing/helpers/getInitialCreditsAmount.server";
import getTeamInviteStatus from "../helpers/getTeamInviteStatus";
import { TeamInviteService } from "../teamInvites";
import type { Route } from "./+types/join.route";

const STATUS_TO_ERROR: Record<string, string> = {
  expired: "EXPIRED_INVITE",
  full: "INVITE_FULL",
  revoked: "INVITE_REVOKED",
};

export async function loader({ params }: Route.LoaderArgs) {
  const invite = await TeamInviteService.findOne({ slug: params.slug });
  if (!invite) throw redirect("/signup?error=EXPIRED_INVITE");

  const status = getTeamInviteStatus(invite);
  if (status !== "active") {
    const errorCode = STATUS_TO_ERROR[status] ?? "EXPIRED_INVITE";
    throw redirect(`/signup?error=${errorCode}`);
  }

  return {
    ok: true,
    slug: invite.slug,
    initialCredits: getInitialCreditsAmount(),
  };
}

export default function JoinRoute({
  params,
  loaderData,
}: Route.ComponentProps) {
  const fetcher = useFetcher();
  const [searchParams] = useSearchParams();

  const onSignupWithGithubClicked = () => {
    fetcher.submit(
      { provider: "github", inviteSlug: params.slug },
      {
        action: "/api/authentication",
        method: "post",
        encType: "application/json",
      },
    );
  };

  const fetcherError = !fetcher.data?.ok ? fetcher.data?.error : null;
  const errorType =
    (fetcherError ? (STATUS_TO_ERROR[fetcherError] ?? fetcherError) : null) ??
    searchParams.get("error");

  return (
    <Signup
      onSignupWithGithubClicked={onSignupWithGithubClicked}
      initialCredits={loaderData.initialCredits}
      errorType={errorType}
      title="National Tutoring Observatory"
      description="You've been invited to the National Tutoring Observatory annotation tool."
      showCredits={false}
    />
  );
}
