import dayjs from "dayjs";
import { UserService } from "~/modules/users/user";
import sessionStorage from "../../../../sessionStorage";
import { authenticator } from "../authentication.server";
import getSessionUser from "../helpers/getSessionUser";
import sanitizeReturnTo from "../helpers/sanitizeReturnTo";
import type { Route } from "./+types/authentication.route";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getSessionUser({ request });

  if (!user) {
    return {
      authentication: {},
    };
  }

  const session = await sessionStorage.getSession(
    request.headers.get("cookie"),
  );
  const lastActivity = session.get("lastActivity") as number | undefined;
  const expirationThreshold = dayjs().subtract(72, "hour");

  if (lastActivity && dayjs(lastActivity).isBefore(expirationThreshold)) {
    // destroy expired session and treat as not authenticated
    return Response.json(
      { authentication: {} },
      {
        headers: { "Set-Cookie": await sessionStorage.destroySession(session) },
      },
    );
  }

  // update last activity and commit session cookie so client stays logged in
  session.set("lastActivity", dayjs().valueOf());
  const headers = new Headers({
    "Set-Cookie": await sessionStorage.commitSession(session),
  });

  return Response.json({ authentication: { data: user } }, { headers });
}

export async function action({ request }: Route.ActionArgs) {
  const clonedRequest = request.clone();

  const data = await clonedRequest.json();

  if (clonedRequest.method === "DELETE") {
    const session = await sessionStorage.getSession(
      clonedRequest.headers.get("cookie"),
    );

    return Response.json(
      {},
      {
        headers: { "Set-Cookie": await sessionStorage.destroySession(session) },
      },
    );
  }

  const referrerSplit = clonedRequest.headers.get("Referer")?.split("/") || [];
  const session = await sessionStorage.getSession(
    clonedRequest.headers.get("cookie"),
  );

  const returnTo = sanitizeReturnTo(data.returnTo);
  if (returnTo !== "/") {
    session.flash("returnTo", returnTo);
  }

  if (
    referrerSplit[referrerSplit.length - 1] === data.inviteId &&
    referrerSplit[referrerSplit.length - 2] === "invite"
  ) {
    const invitedUsers = await UserService.find({
      match: { inviteId: data.inviteId, isRegistered: false },
    });
    if (invitedUsers.length === 0) {
      return Response.json(
        { ok: false, error: "Invalid invite" },
        { status: 404 },
      );
    }
    session.flash("inviteId", data.inviteId);
  }

  try {
    await authenticator.authenticate(data.provider, request);
  } catch (error) {
    if (error instanceof Response) {
      error.headers.append(
        "Set-Cookie",
        await sessionStorage.commitSession(session),
      );
      throw error;
    }
    throw error;
  }
}
