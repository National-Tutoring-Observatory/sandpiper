import { TOKEN_EXPIRATION_DAYS } from "~/modules/tokens/tokens.types";

const apiKeyExpirationOptions = TOKEN_EXPIRATION_DAYS.map((days) => ({
  value: String(days),
  text: `${days} days`,
}));

export default apiKeyExpirationOptions;
