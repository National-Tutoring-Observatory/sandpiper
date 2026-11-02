import crypto from "crypto";
import { isValidObjectId } from "mongoose";
import type { ControllerContext } from "../api/api.types";
import { Token } from "./tokens.model";
import type {
  CreateTokenInput,
  DeleteTokenInput,
  GetTokensByActiveTeamInput,
  TokenDoc,
  TokensList,
} from "./tokens.types";

const TOKEN_PREFIX = "sp_";

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function getTokensByActiveTeam(
  { currentPage = 1 }: GetTokensByActiveTeamInput,
  context: ControllerContext,
): Promise<TokensList> {
  const { activeTeam } = context;
  if (!activeTeam) return { count: 0, data: [], currentPage, totalPages: 1 };

  const match = { ref: activeTeam, refType: "team", isDeleted: false };
  const { skip, limit } = getModelPaginationByCurrentPage(currentPage, {});
  const [data, count] = await Promise.all([
    Token.find(match)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean<TokenDoc[]>(),
    Token.countDocuments(match),
  ]);

  return { count, data, currentPage, totalPages: getTotalPages(count) };
}

export async function createToken(
  { name, expiresAt }: CreateTokenInput,
  context: ControllerContext,
) {
  const { activeTeam, user } = context;
  if (!user || !activeTeam) {
    throw { statusCode: 400, message: "No active team" };
  }
  if (expiresAt && expiresAt.getTime() <= Date.now()) {
    throw { statusCode: 400, message: "expiresAt must be in the future" };
  }

  const token = `${TOKEN_PREFIX}${crypto.randomBytes(32).toString("base64url")}`;
  const doc = await Token.create({
    name,
    token: hashToken(token),
    tokenPrefix: token.slice(0, TOKEN_PREFIX.length + 8),
    ref: activeTeam,
    refType: "team",
    createdBy: user._id,
    expiresAt,
  });

  const { token: _hash, ...created } = doc.toObject();
  return { data: { ...created, token } };
}

export async function deleteTokenById(
  { tokenId }: DeleteTokenInput,
  context: ControllerContext,
) {
  const { activeTeam, user } = context;
  if (!user || !activeTeam) {
    throw { statusCode: 400, message: "No active team" };
  }
  if (!isValidObjectId(tokenId)) {
    throw { statusCode: 404, message: "Token not found" };
  }

  const result = await Token.updateOne(
    { _id: tokenId, ref: activeTeam, refType: "team", isDeleted: false },
    { isDeleted: true, deletedAt: new Date(), deletedBy: user._id },
  );
  if (result.matchedCount === 0) {
    throw { statusCode: 404, message: "Token not found" };
  }

  return { data: { deleted: true } };
}
