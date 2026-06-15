export default function securityHeadersEnabled(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.ENABLE_SECURITY_HEADERS === "true"
  );
}
