import type { InferSchemaType } from "mongoose";
import type tokenSchema from "~/lib/schemas/token.schema";

export type TokenDoc = InferSchemaType<typeof tokenSchema>;

export type GetTokensByActiveTeamInput = {
  currentPage?: number;
  searchValue?: string;
};

export const TOKEN_EXPIRATION_DAYS = [7, 14, 30] as const;
export type TokenExpirationDays = (typeof TOKEN_EXPIRATION_DAYS)[number];

export type CreateTokenInput = {
  name: string;
  expiresInDays: TokenExpirationDays;
};

export type UpdateTokenInput = {
  tokenId: string;
  name: string;
};

export type RegenerateTokenInput = {
  tokenId: string;
};

export type DeleteTokenInput = {
  tokenId: string;
};

export interface TokensList {
  count: number;
  data: TokenDoc[];
  currentPage: number;
  totalPages: number;
}
