export type NavMode = "team" | "admin";

const ADMIN_PREFIXES = ["/admin", "/featureFlags", "/queues", "/migrations"];

export default function getNavMode(pathname: string): NavMode {
  if (pathname === "/teams") return "admin";
  for (const prefix of ADMIN_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`))
      return "admin";
  }
  return "team";
}
