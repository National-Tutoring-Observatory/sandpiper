import { redirect } from "react-router";
import trackServerEvent from "~/modules/analytics/helpers/trackServerEvent.server";
import sessionStorage from "../../../../sessionStorage";
import { authenticator } from "../authentication.server";
import consumeInviteCarriers from "../helpers/consumeInviteCarriers";
import sanitizeReturnTo from "../helpers/sanitizeReturnTo";
import type { Route } from "./+types/authCallback.route";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await authenticator.authenticate(params.provider, request);

  const session = await sessionStorage.getSession(
    request.headers.get("cookie"),
  );

  const returnTo = sanitizeReturnTo(session.get("returnTo"));

  consumeInviteCarriers(session);

  session.set("user", user);

  const needsOnboarding = !user.onboardingComplete;

  // Onboarding sits between the callback and wherever the user was headed, so
  // hand returnTo across it instead of dropping them on the dashboard.
  if (needsOnboarding && returnTo !== "/") {
    session.flash("returnTo", returnTo);
  }

  const headers = new Headers({
    "Set-Cookie": await sessionStorage.commitSession(session),
  });

  trackServerEvent({ name: "user_logged_in", userId: user._id });

  if (needsOnboarding) {
    return redirect("/onboarding", { headers });
  }

  return redirect(returnTo, { headers });
}
