import { redirect } from "react-router";
import sessionStorage from "../../../../sessionStorage";
import getSessionUser from "./getSessionUser";

export default async function requireAuth({ request }: { request: Request }) {
  const user = await getSessionUser({ request });
  if (!user) {
    const { pathname, search } = new URL(request.url);
    const session = await sessionStorage.getSession(
      request.headers.get("cookie"),
    );

    // Only capture returnTo for real page navigations. React Router revalidates
    // route loaders and mounted fetcher.load() calls after every mutation — so
    // signing out fires a batch of unauthenticated data requests, each of which
    // would otherwise write its own path as returnTo (last response wins) and
    // dump the user on a JSON resource route after signing back in.
    // Sec-Fetch-Mode is absent for non-browser clients, so treat that as a
    // navigation; the /api/ check covers those cases.
    const fetchMode = request.headers.get("Sec-Fetch-Mode");
    const isDataRequest = fetchMode !== null && fetchMode !== "navigate";

    if (!isDataRequest && !pathname.startsWith("/api/")) {
      session.flash("returnTo", pathname + search);
    }

    throw redirect("/signup", {
      headers: { "Set-Cookie": await sessionStorage.commitSession(session) },
    });
  }
  return user;
}
