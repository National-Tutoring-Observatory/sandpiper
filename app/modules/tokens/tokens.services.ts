import getModelPaginationByCurrentPage from "~/modules/app/helpers/getModelPaginationByCurrentPage";
import getTotalPages from "~/modules/app/helpers/getTotalPages";
import type { ControllerContext } from "../api/api.types";
import generateToken from "./helpers/generateToken";
import getActiveTokenMatch from "./helpers/getActiveTokenMatch";
import { Token } from "./tokens.model";
import type {
  CreateTokenInput,
  DeleteTokenInput,
  GetTokensByActiveTeamInput,
  RegenerateTokenInput,
  TokenDoc,
  TokensList,
  UpdateTokenInput,
} from "./tokens.types";

export async function getTokensByActiveTeam(
  { currentPage = 1 }: GetTokensByActiveTeamInput,
  context: ControllerContext,
): Promise<TokensList> {
  const { activeTeam } = context;
  if (!activeTeam) return { count: 0, data: [], currentPage, totalPages: 1 };

  const match = { ref: activeTeam, refType: "team", isDeleted: false };
  const { skip, limit } = getModelPaginationByCurrentPage(currentPage);
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

  const { token, hash, tokenPrefix } = generateToken();
  const doc = await Token.create({
    name,
    token: hash,
    tokenPrefix,
    ref: activeTeam,
    refType: "team",
    createdBy: user._id,
    expiresAt,
  });

  const { token: _hash, ...created } = doc.toObject();
  return { data: { ...created, token } };
}

export async function updateTokenById(
  { tokenId, name }: UpdateTokenInput,
  context: ControllerContext,
) {
  const { match } = getActiveTokenMatch(tokenId, context);

  const updated = await Token.findOneAndUpdate(
    match,
    { name },
    { new: true },
  ).lean<TokenDoc>();
  if (!updated) {
    throw { statusCode: 404, message: "Token not found" };
  }

  return { data: updated };
}

export async function regenerateTokenById(
  { tokenId }: RegenerateTokenInput,
  context: ControllerContext,
) {
  const { match } = getActiveTokenMatch(tokenId, context);
  const { token, hash, tokenPrefix } = generateToken();

  const updated = await Token.findOneAndUpdate(
    match,
    { token: hash, tokenPrefix, $unset: { lastUsedAt: 1 } },
    { new: true },
  ).lean<TokenDoc>();
  if (!updated) {
    throw { statusCode: 404, message: "Token not found" };
  }

  return { data: { ...updated, token } };
}

export async function deleteTokenById(
  { tokenId }: DeleteTokenInput,
  context: ControllerContext,
) {
  const { match, user } = getActiveTokenMatch(tokenId, context);

  const result = await Token.updateOne(match, {
    isDeleted: true,
    deletedAt: new Date(),
    deletedBy: user._id,
  });
  if (result.matchedCount === 0) {
    throw { statusCode: 404, message: "Token not found" };
  }

  return { data: { deleted: true } };
}
