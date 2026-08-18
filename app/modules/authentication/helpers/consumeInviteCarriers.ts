import type { Session } from "react-router";

const INVITE_CARRIER_KEYS = ["inviteId", "teamInviteId"];

/**
 * This looks like a no-op. It is not.
 *
 * For a flash value, `session.get(key)` IS the delete: it returns the value and
 * removes it from the session. The caller's `commitSession` then writes that
 * removal back to the browser. Discarding the return value is the point — we
 * want the removal, not the value.
 *
 * It has to happen here because `authCallback` is the one place the session is
 * committed. The auth strategy reads these same keys on a session it throws
 * away, so the removal never reached the cookie: the invite id stayed there and
 * blocked every later sign-in (#2461).
 *
 * Do not "simplify" this to `session.unset(key)`. Flash values are stored under
 * `__flash_<key>__`, so `unset(key)` silently does nothing.
 */
export default function consumeInviteCarriers(session: Session): void {
  for (const key of INVITE_CARRIER_KEYS) {
    void session.get(key);
  }
}
