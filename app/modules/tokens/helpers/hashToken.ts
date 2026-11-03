import crypto from "crypto";

export default function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
