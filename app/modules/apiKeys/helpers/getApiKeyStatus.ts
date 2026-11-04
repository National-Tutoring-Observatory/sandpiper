import type { ApiKey, ApiKeyStatus } from "../apiKeys.types";

export default function getApiKeyStatus(apiKey: ApiKey): ApiKeyStatus {
  if (apiKey.isDeleted) return "Revoked";
  if (apiKey.expiresAt && new Date(apiKey.expiresAt) <= new Date()) {
    return "Expired";
  }
  return "Active";
}
