import type { Request, Response } from "express";
import { Types } from "mongoose";
import { beforeEach, describe, expect, it } from "vitest";
import { UserService } from "~/modules/users/user";
import type { User } from "~/modules/users/users.types";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import type { ControllerContext } from "../../api/api.types";
import { Token } from "../tokens.model";
import {
  createToken,
  deleteTokenById,
  getTokensByActiveTeam,
  hashToken,
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

describe("hashToken", () => {
  it("returns the sha256 hex digest", () => {
    expect(hashToken("sp_abc")).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken("sp_abc")).toBe(hashToken("sp_abc"));
    expect(hashToken("sp_abc")).not.toBe(hashToken("sp_abd"));
  });
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

  it("excludes deleted tokens", async () => {
    const { data: created } = await createToken(
      { name: "Deleted" },
      makeContext(),
    );
    await Token.updateOne({ _id: created._id }, { isDeleted: true });

    const result = await getTokensByActiveTeam({}, makeContext());
    expect(result.count).toBe(0);
    expect(result.data).toEqual([]);
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

  it("removes the token from the active team's list", async () => {
    const { data: created } = await createToken({ name: "CI" }, makeContext());
    await deleteTokenById({ tokenId: created._id.toString() }, makeContext());

    const result = await getTokensByActiveTeam({}, makeContext());
    expect(result.count).toBe(0);
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
