export interface ApiKey {
  _id: string;
  name: string;
  tokenPrefix: string;
  createdAt: string;
  expiresAt?: string;
  lastUsedAt?: string;
  isDeleted?: boolean;
}

export type ApiKeyStatus = "Active" | "Expired" | "Revoked";
