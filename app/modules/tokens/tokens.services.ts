import dayjs from "dayjs";
import type { Types } from "mongoose";
import buildQueryFromParams from "~/modules/app/helpers/buildQueryFromParams";
import getModelPaginationByCurrentPage from "~/modules/app/helpers/getModelPaginationByCurrentPage";
import getTotalPages from "~/modules/app/helpers/getTotalPages";
import type { ControllerContext } from "../api/api.types";
import generateToken from "./helpers/generateToken";
import getActiveTokenMatch from "./helpers/getActiveTokenMatch";
import hashToken from "./helpers/hashToken";
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
  { currentPage = 1, searchValue }: GetTokensByActiveTeamInput,
  context: ControllerContext,
): Promise<TokensList> {
  const { activeTeam } = context;
  if (!activeTeam) return { count: 0, data: [], currentPage, totalPages: 1 };

  const { match } = buildQueryFromParams({
    match: { ref: activeTeam, refType: "team" },
    queryParams: { searchValue },
    searchableFields: ["name", "tokenPrefix"],
    sortableFields: [],
  });
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
  { name, expiresInDays }: CreateTokenInput,
  context: ControllerContext,
) {
  const { activeTeam, user } = context;
  if (!user || !activeTeam) {
    throw { statusCode: 400, message: "No active team" };
  }

  const { token, hash, tokenPrefix } = generateToken();
  const doc = await Token.create({
    name,
    token: hash,
    tokenPrefix,
    ref: activeTeam,
    refType: "team",
    createdBy: user._id,
    expiresAt: dayjs().add(expiresInDays, "day").toDate(),
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
    {
      token: hash,
      tokenPrefix,
      rateLimitCount: 0,
      $unset: { lastUsedAt: 1, rateLimitWindowStart: 1 },
    },
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

export async function findValidTokenByApiKey(apiKey: string) {
  return Token.findOne({
    token: hashToken(apiKey),
    isDeleted: false,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } },
    ],
  }).lean<TokenDoc & { _id: Types.ObjectId }>();
}

const RATE_LIMIT = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

export async function consumeTokenUsage(tokenId: string): Promise<boolean> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS);

  const withinWindow = await Token.updateOne(
    {
      _id: tokenId,
      rateLimitWindowStart: { $gt: windowStart },
      rateLimitCount: { $lt: RATE_LIMIT },
    },
    {
      $inc: { usageCount: 1, rateLimitCount: 1 },
      $set: { lastUsedAt: now },
    },
  );
  if (withinWindow.matchedCount > 0) return true;

  const newWindow = await Token.updateOne(
    {
      _id: tokenId,
      $or: [
        { rateLimitWindowStart: { $exists: false } },
        { rateLimitWindowStart: { $lte: windowStart } },
      ],
    },
    {
      $inc: { usageCount: 1 },
      $set: { rateLimitCount: 1, rateLimitWindowStart: now, lastUsedAt: now },
    },
  );
  if (newWindow.matchedCount > 0) return true;

  await Token.updateOne(
    { _id: tokenId },
    { $inc: { usageCount: 1 }, $set: { lastUsedAt: now } },
  );
  return false;
}
