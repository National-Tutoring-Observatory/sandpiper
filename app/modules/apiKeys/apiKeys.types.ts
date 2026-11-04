export interface ApiKey {
  _id: string;
  name: string;
  tokenPrefix: string;
  createdAt: string;
  expiresAt?: string;
  lastUsedAt?: string;
  usageCount: number;
  isDeleted?: boolean;
}

export type ApiKeyStatus = "Active" | "Expired" | "Revoked";
