import crypto from "crypto";
import hashToken from "./hashToken";

const TOKEN_PREFIX = "sp_";

export default function generateToken() {
  const token = `${TOKEN_PREFIX}${crypto.randomBytes(32).toString("base64url")}`;
  return {
    token,
    hash: hashToken(token),
    tokenPrefix: token.slice(0, TOKEN_PREFIX.length + 8),
  };
}
