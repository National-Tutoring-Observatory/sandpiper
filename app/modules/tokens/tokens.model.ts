import mongoose from "mongoose";
import tokenSchema from "~/lib/schemas/token.schema";
import type { TokenDoc } from "./tokens.types";

export const Token =
  (mongoose.models.Token as mongoose.Model<TokenDoc>) ??
  mongoose.model("Token", tokenSchema);
