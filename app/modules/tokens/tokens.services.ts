import type { ControllerContext } from "../api/api.types";
import { Token, type TokenDoc } from "./tokens.model";

export async function getTokensByActiveTeam(
  context: ControllerContext,
): Promise<{
  count: number;
  data: TokenDoc[];
  currentPage: number;
  totalPages: number;
}> {
  const { activeTeam } = context;
  if (!activeTeam) return { count: 0, data: [], currentPage: 1, totalPages: 1 };

  const match = { ref: activeTeam, refType: "team", isDeleted: false };
  const [data, count] = await Promise.all([
    Token.find(match).sort({ createdAt: -1 }).lean<TokenDoc[]>(),
    Token.countDocuments(match),
  ]);

  return { count, data, currentPage: 1, totalPages: 1 };
}
