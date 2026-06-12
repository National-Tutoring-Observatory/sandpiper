import { useFetcher, useSearchParams } from "react-router";
import Signup from "~/modules/authentication/components/signup";
import getInitialCreditsAmount from "~/modules/billing/helpers/getInitialCreditsAmount.server";
import type { Route } from "./+types/invite.route";

export async function loader() {
  return { initialCredits: getInitialCreditsAmount() };
}

export default function InviteRoute({
  params,
  loaderData,
}: Route.ComponentProps) {
  const fetcher = useFetcher();
  const [searchParams] = useSearchParams();

  const onSignupWithGithubClicked = () => {
    fetcher.submit(
      { provider: "github", inviteId: params.id },
      {
        action: `/api/authentication`,
        method: "post",
        encType: "application/json",
      },
    );
  };

  const errorType =
    (!fetcher.data?.ok ? fetcher.data?.error : null) ??
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
