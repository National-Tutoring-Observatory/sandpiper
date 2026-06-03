const COOKIE_NAME = "sandpiper.activeTeamId";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

const ID_PATTERN = /^[a-f0-9]{24}$/;
function isValidId(value: string): boolean {
  return ID_PATTERN.test(value);
}

export function readActiveTeamFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name !== COOKIE_NAME) continue;
    const value = decodeURIComponent(rest.join("="));
    return isValidId(value) ? value : null;
  }
  return null;
}

export function serializeActiveTeamCookie(teamId: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=${encodeURIComponent(teamId)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

export function readActiveTeamFromBrowser(): string | null {
  if (typeof document === "undefined") return null;
  for (const part of document.cookie.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name !== COOKIE_NAME) continue;
    const value = decodeURIComponent(rest.join("="));
    return isValidId(value) ? value : null;
  }
  return null;
}

export function writeActiveTeamToBrowser(teamId: string): void {
  if (typeof document === "undefined") return;
  document.cookie = serializeActiveTeamCookie(teamId);
}
