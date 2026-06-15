type GithubEmail = { primary?: boolean; email: string };

const hasEmail = (e: unknown): e is GithubEmail =>
  typeof e === "object" &&
  e !== null &&
  typeof (e as GithubEmail).email === "string";

export default function extractPrimaryEmail(emails: unknown): string | null {
  if (!Array.isArray(emails)) return null;

  const candidates = emails.filter(hasEmail);
  const email = (
    candidates.find((e) => e.primary) ?? candidates[0]
  )?.email.trim();

  return email || null;
}
