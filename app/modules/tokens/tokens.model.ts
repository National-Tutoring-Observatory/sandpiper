import mongoose, { type InferSchemaType } from "mongoose";
import tokenSchema from "~/lib/schemas/token.schema";

export type TokenDoc = InferSchemaType<typeof tokenSchema>;

export const Token =
  (mongoose.models.Token as mongoose.Model<TokenDoc>) ??
  mongoose.model("Token", tokenSchema);
