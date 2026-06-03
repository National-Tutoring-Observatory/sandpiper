export type NavMode = "team" | "admin";

export default function getNavMode(pathname: string): NavMode {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
  return "team";
}
