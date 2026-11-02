import type { InferSchemaType } from "mongoose";
import type tokenSchema from "~/lib/schemas/token.schema";

export type TokenDoc = InferSchemaType<typeof tokenSchema>;

export type GetTokensByActiveTeamInput = {
  currentPage?: number;
};

export type CreateTokenInput = {
  name: string;
  expiresAt?: Date;
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
