import type { Request, Response } from "express";
import { Types } from "mongoose";
import { beforeEach, describe, expect, it } from "vitest";
import { UserService } from "~/modules/users/user";
import type { User } from "~/modules/users/users.types";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import type { ControllerContext } from "../../api/api.types";
import hashToken from "../helpers/hashToken";
import { Token } from "../tokens.model";
import {
  consumeTokenUsage,
  createToken,
  deleteTokenById,
  getTokensByActiveTeam,
  regenerateTokenById,
  updateTokenById,
} from "../tokens.services";

let user: User;
let teamId: string;

function makeContext(activeTeam: string | null = teamId): ControllerContext {
  return {
    req: {} as Request,
    res: {} as Response,
    user,
    activeTeam,
  };
}

beforeEach(async () => {
  await clearDocumentDB();
  user = await UserService.create({ username: "test_user" });
  teamId = new Types.ObjectId().toString();
});

describe("createToken", () => {
  it("returns the plaintext token with its prefix", async () => {
    const { data: created } = await createToken({ name: "CI" }, makeContext());
    expect(created.token).toMatch(/^sp_[A-Za-z0-9_-]{43}$/);
    expect(created.token.startsWith(created.tokenPrefix)).toBe(true);
    expect(created.tokenPrefix).toHaveLength(11);
  });

  it("stores the hash of the token, never the plaintext", async () => {
    const { data: created } = await createToken({ name: "CI" }, makeContext());
    const stored = await Token.findById(created._id).select("+token").lean();
    expect(stored?.token).toBe(hashToken(created.token));
    expect(stored?.token).not.toBe(created.token);
  });

  it("scopes the token to the active team and records the creator", async () => {
    const { data: created } = await createToken({ name: "CI" }, makeContext());
    const stored = await Token.findById(created._id).lean();
    expect(stored?.name).toBe("CI");
    expect(stored?.ref.toString()).toBe(teamId);
    expect(stored?.refType).toBe("team");
    expect(stored?.createdBy?.toString()).toBe(user._id.toString());
    expect(stored?.isDeleted).toBe(false);
  });

  it("stores expiresAt when given", async () => {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const { data: created } = await createToken(
      { name: "CI", expiresAt },
      makeContext(),
    );
    expect(created.expiresAt).toEqual(expiresAt);
  });

  it("generates a different token each time", async () => {
    const { data: first } = await createToken({ name: "One" }, makeContext());
    const { data: second } = await createToken({ name: "Two" }, makeContext());
    expect(first.token).not.toBe(second.token);
  });

  it("rejects when there is no active team", async () => {
    await expect(
      createToken({ name: "CI" }, makeContext(null)),
    ).rejects.toEqual({ statusCode: 400, message: "No active team" });
    expect(await Token.countDocuments()).toBe(0);
  });

  it("rejects an expiresAt in the past", async () => {
    const expiresAt = new Date(Date.now() - 1000);
    await expect(
      createToken({ name: "CI", expiresAt }, makeContext()),
    ).rejects.toEqual({
      statusCode: 400,
      message: "expiresAt must be in the future",
    });
    expect(await Token.countDocuments()).toBe(0);
  });
});

describe("getTokensByActiveTeam", () => {
  it("returns the active team's tokens with pagination fields", async () => {
    await createToken({ name: "One" }, makeContext());
    await createToken({ name: "Two" }, makeContext());

    const result = await getTokensByActiveTeam({}, makeContext());
    expect(result.count).toBe(2);
    expect(result.data).toHaveLength(2);
    expect(result.currentPage).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  it("returns 20 tokens per page with the total page count", async () => {
    await Token.insertMany(
      Array.from({ length: 25 }, (_, i) => ({
        name: `Token ${i}`,
        token: hashToken(`sp_${i}`),
        tokenPrefix: `sp_${i}`,
        ref: teamId,
        refType: "team",
      })),
    );

    const firstPage = await getTokensByActiveTeam({}, makeContext());
    expect(firstPage.count).toBe(25);
    expect(firstPage.data).toHaveLength(20);
    expect(firstPage.currentPage).toBe(1);
    expect(firstPage.totalPages).toBe(2);

    const secondPage = await getTokensByActiveTeam(
      { currentPage: 2 },
      makeContext(),
    );
    expect(secondPage.count).toBe(25);
    expect(secondPage.data).toHaveLength(5);
    expect(secondPage.currentPage).toBe(2);
    expect(secondPage.totalPages).toBe(2);
  });

  it("returns newest first", async () => {
    await createToken({ name: "Older" }, makeContext());
    await new Promise((resolve) => setTimeout(resolve, 5));
    await createToken({ name: "Newer" }, makeContext());

    const result = await getTokensByActiveTeam({}, makeContext());
    expect(result.data.map((t) => t.name)).toEqual(["Newer", "Older"]);
  });

  it("excludes tokens from other teams", async () => {
    await createToken({ name: "Mine" }, makeContext());
    await createToken(
      { name: "Theirs" },
      makeContext(new Types.ObjectId().toString()),
    );

    const result = await getTokensByActiveTeam({}, makeContext());
    expect(result.count).toBe(1);
    expect(result.data.map((t) => t.name)).toEqual(["Mine"]);
  });

  it("includes deleted tokens", async () => {
    const { data: created } = await createToken(
      { name: "Deleted" },
      makeContext(),
    );
    await Token.updateOne({ _id: created._id }, { isDeleted: true });

    const result = await getTokensByActiveTeam({}, makeContext());
    expect(result.count).toBe(1);
    expect(result.data[0].isDeleted).toBe(true);
  });

  it("filters by name when given a search value", async () => {
    await createToken({ name: "Production" }, makeContext());
    await createToken({ name: "Staging" }, makeContext());

    const result = await getTokensByActiveTeam(
      { searchValue: "prod" },
      makeContext(),
    );
    expect(result.count).toBe(1);
    expect(result.data.map((t) => t.name)).toEqual(["Production"]);
  });

  it("filters by token prefix when given a search value", async () => {
    const { data: created } = await createToken({ name: "CI" }, makeContext());
    await createToken({ name: "Other" }, makeContext());

    const result = await getTokensByActiveTeam(
      { searchValue: created.tokenPrefix },
      makeContext(),
    );
    expect(result.data.map((t) => t.name)).toEqual(["CI"]);
  });

  it("does not search other teams' tokens", async () => {
    await createToken({ name: "Production" }, makeContext());
    await createToken(
      { name: "Production" },
      makeContext(new Types.ObjectId().toString()),
    );

    const result = await getTokensByActiveTeam(
      { searchValue: "Production" },
      makeContext(),
    );
    expect(result.count).toBe(1);
  });

  it("does not return the token hash", async () => {
    await createToken({ name: "CI" }, makeContext());

    const result = await getTokensByActiveTeam({}, makeContext());
    expect(result.data[0]).not.toHaveProperty("token");
  });

  it("returns an empty result when there is no active team", async () => {
    await createToken({ name: "CI" }, makeContext());

    const result = await getTokensByActiveTeam({}, makeContext(null));
    expect(result).toEqual({
      count: 0,
      data: [],
      currentPage: 1,
      totalPages: 1,
    });
  });
});

describe("deleteTokenById", () => {
  it("soft deletes the token and records who deleted it", async () => {
    const { data: created } = await createToken({ name: "CI" }, makeContext());

    const result = await deleteTokenById(
      { tokenId: created._id.toString() },
      makeContext(),
    );
    expect(result).toEqual({ data: { deleted: true } });

    const stored = await Token.findById(created._id).lean();
    expect(stored?.isDeleted).toBe(true);
    expect(stored?.deletedAt).toBeInstanceOf(Date);
    expect(stored?.deletedBy?.toString()).toBe(user._id.toString());
  });

  it("keeps the token in the active team's list as deleted", async () => {
    const { data: created } = await createToken({ name: "CI" }, makeContext());
    await deleteTokenById({ tokenId: created._id.toString() }, makeContext());

    const result = await getTokensByActiveTeam({}, makeContext());
    expect(result.count).toBe(1);
    expect(result.data[0].isDeleted).toBe(true);
  });

  it("does not delete a token belonging to another team", async () => {
    const { data: created } = await createToken(
      { name: "Theirs" },
      makeContext(new Types.ObjectId().toString()),
    );

    await expect(
      deleteTokenById({ tokenId: created._id.toString() }, makeContext()),
    ).rejects.toEqual({ statusCode: 404, message: "Token not found" });

    const stored = await Token.findById(created._id).lean();
    expect(stored?.isDeleted).toBe(false);
  });

  it("rejects a token that is already deleted", async () => {
    const { data: created } = await createToken({ name: "CI" }, makeContext());
    await deleteTokenById({ tokenId: created._id.toString() }, makeContext());

    await expect(
      deleteTokenById({ tokenId: created._id.toString() }, makeContext()),
    ).rejects.toEqual({ statusCode: 404, message: "Token not found" });
  });

  it("rejects a token id that does not exist", async () => {
    await expect(
      deleteTokenById(
        { tokenId: new Types.ObjectId().toString() },
        makeContext(),
      ),
    ).rejects.toEqual({ statusCode: 404, message: "Token not found" });
  });

  it("rejects an invalid token id", async () => {
    await expect(
      deleteTokenById({ tokenId: "not-an-id" }, makeContext()),
    ).rejects.toEqual({ statusCode: 404, message: "Token not found" });
  });

  it("rejects when there is no active team", async () => {
    const { data: created } = await createToken({ name: "CI" }, makeContext());

    await expect(
      deleteTokenById({ tokenId: created._id.toString() }, makeContext(null)),
    ).rejects.toEqual({ statusCode: 400, message: "No active team" });

    const stored = await Token.findById(created._id).lean();
    expect(stored?.isDeleted).toBe(false);
  });
});

describe("updateTokenById", () => {
  it("renames the token", async () => {
    const { data: created } = await createToken({ name: "CI" }, makeContext());

    const { data: updated } = await updateTokenById(
      { tokenId: created._id.toString(), name: "Renamed" },
      makeContext(),
    );
    expect(updated.name).toBe("Renamed");

    const stored = await Token.findById(created._id).lean();
    expect(stored?.name).toBe("Renamed");
  });

  it("does not return the token hash", async () => {
    const { data: created } = await createToken({ name: "CI" }, makeContext());

    const { data: updated } = await updateTokenById(
      { tokenId: created._id.toString(), name: "Renamed" },
      makeContext(),
    );
    expect(updated).not.toHaveProperty("token");
  });

  it("does not rename a token belonging to another team", async () => {
    const { data: created } = await createToken(
      { name: "Theirs" },
      makeContext(new Types.ObjectId().toString()),
    );

    await expect(
      updateTokenById(
        { tokenId: created._id.toString(), name: "Renamed" },
        makeContext(),
      ),
    ).rejects.toEqual({ statusCode: 404, message: "Token not found" });

    const stored = await Token.findById(created._id).lean();
    expect(stored?.name).toBe("Theirs");
  });

  it("rejects a deleted token", async () => {
    const { data: created } = await createToken({ name: "CI" }, makeContext());
    await deleteTokenById({ tokenId: created._id.toString() }, makeContext());

    await expect(
      updateTokenById(
        { tokenId: created._id.toString(), name: "Renamed" },
        makeContext(),
      ),
    ).rejects.toEqual({ statusCode: 404, message: "Token not found" });
  });

  it("rejects an invalid token id", async () => {
    await expect(
      updateTokenById({ tokenId: "not-an-id", name: "Renamed" }, makeContext()),
    ).rejects.toEqual({ statusCode: 404, message: "Token not found" });
  });

  it("rejects when there is no active team", async () => {
    const { data: created } = await createToken({ name: "CI" }, makeContext());

    await expect(
      updateTokenById(
        { tokenId: created._id.toString(), name: "Renamed" },
        makeContext(null),
      ),
    ).rejects.toEqual({ statusCode: 400, message: "No active team" });
  });
});

describe("regenerateTokenById", () => {
  it("returns a new plaintext token and replaces the stored hash", async () => {
    const { data: created } = await createToken({ name: "CI" }, makeContext());

    const { data: regenerated } = await regenerateTokenById(
      { tokenId: created._id.toString() },
      makeContext(),
    );
    expect(regenerated.token).toMatch(/^sp_[A-Za-z0-9_-]{43}$/);
    expect(regenerated.token).not.toBe(created.token);
    expect(regenerated.token.startsWith(regenerated.tokenPrefix)).toBe(true);

    const stored = await Token.findById(created._id).select("+token").lean();
    expect(stored?.token).toBe(hashToken(regenerated.token));
    expect(stored?.token).not.toBe(hashToken(created.token));
  });

  it("keeps the token's name and clears lastUsedAt", async () => {
    const { data: created } = await createToken({ name: "CI" }, makeContext());
    await Token.updateOne({ _id: created._id }, { lastUsedAt: new Date() });

    await regenerateTokenById(
      { tokenId: created._id.toString() },
      makeContext(),
    );

    const stored = await Token.findById(created._id).lean();
    expect(stored?.name).toBe("CI");
    expect(stored?.lastUsedAt).toBeUndefined();
  });

  it("resets the rate limit window but keeps usageCount", async () => {
    const { data: created } = await createToken({ name: "CI" }, makeContext());
    await Token.updateOne(
      { _id: created._id },
      { usageCount: 7, rateLimitCount: 7, rateLimitWindowStart: new Date() },
    );

    await regenerateTokenById(
      { tokenId: created._id.toString() },
      makeContext(),
    );

    const stored = await Token.findById(created._id).lean();
    expect(stored?.usageCount).toBe(7);
    expect(stored?.rateLimitCount).toBe(0);
    expect(stored?.rateLimitWindowStart).toBeUndefined();
  });

  it("does not regenerate a token belonging to another team", async () => {
    const { data: created } = await createToken(
      { name: "Theirs" },
      makeContext(new Types.ObjectId().toString()),
    );

    await expect(
      regenerateTokenById({ tokenId: created._id.toString() }, makeContext()),
    ).rejects.toEqual({ statusCode: 404, message: "Token not found" });

    const stored = await Token.findById(created._id).select("+token").lean();
    expect(stored?.token).toBe(hashToken(created.token));
  });

  it("rejects a deleted token", async () => {
    const { data: created } = await createToken({ name: "CI" }, makeContext());
    await deleteTokenById({ tokenId: created._id.toString() }, makeContext());

    await expect(
      regenerateTokenById({ tokenId: created._id.toString() }, makeContext()),
    ).rejects.toEqual({ statusCode: 404, message: "Token not found" });
  });

  it("rejects when there is no active team", async () => {
    const { data: created } = await createToken({ name: "CI" }, makeContext());

    await expect(
      regenerateTokenById(
        { tokenId: created._id.toString() },
        makeContext(null),
      ),
    ).rejects.toEqual({ statusCode: 400, message: "No active team" });
  });
});

describe("consumeTokenUsage", () => {
  async function createTokenId() {
    const { data: created } = await createToken({ name: "CI" }, makeContext());
    return created._id.toString();
  }

  it("starts a window and counts the first use", async () => {
    const tokenId = await createTokenId();

    expect(await consumeTokenUsage(tokenId)).toBe(true);

    const stored = await Token.findById(tokenId).lean();
    expect(stored?.usageCount).toBe(1);
    expect(stored?.rateLimitCount).toBe(1);
    expect(stored?.rateLimitWindowStart).toBeInstanceOf(Date);
    expect(stored?.lastUsedAt).toBeInstanceOf(Date);
  });

  it("allows 10 uses per window then rejects", async () => {
    const tokenId = await createTokenId();

    for (let i = 0; i < 10; i++) {
      expect(await consumeTokenUsage(tokenId)).toBe(true);
    }
    expect(await consumeTokenUsage(tokenId)).toBe(false);

    const stored = await Token.findById(tokenId).lean();
    expect(stored?.rateLimitCount).toBe(10);
  });

  it("counts rejected uses in usageCount", async () => {
    const tokenId = await createTokenId();

    for (let i = 0; i < 12; i++) await consumeTokenUsage(tokenId);

    const stored = await Token.findById(tokenId).lean();
    expect(stored?.usageCount).toBe(12);
  });

  it("starts a new window once the previous one has passed", async () => {
    const tokenId = await createTokenId();
    await Token.updateOne(
      { _id: tokenId },
      {
        usageCount: 10,
        rateLimitCount: 10,
        rateLimitWindowStart: new Date(Date.now() - 61_000),
      },
    );

    expect(await consumeTokenUsage(tokenId)).toBe(true);

    const stored = await Token.findById(tokenId).lean();
    expect(stored?.usageCount).toBe(11);
    expect(stored?.rateLimitCount).toBe(1);
  });
});
