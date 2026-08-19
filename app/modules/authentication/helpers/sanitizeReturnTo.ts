export default function sanitizeReturnTo(value: unknown): string {
  if (typeof value !== "string") return "/";
  // Block open redirect bypasses — protocol-relative (//) and backslash normalization (/\)
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.startsWith("/\\")
  )
    return "/";
  // Resource routes (loader-only, no default export) render as a broken page on
  // a document request, and /auth/* would restart the OAuth handshake. Rejecting
  // them here also heals sessions already holding a poisoned returnTo.
  if (value.startsWith("/api/") || value.startsWith("/auth/")) return "/";
  return value;
}
