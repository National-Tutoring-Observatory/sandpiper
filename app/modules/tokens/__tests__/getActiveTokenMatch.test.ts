import type { Request, Response } from "express";
import { Types } from "mongoose";
import { describe, expect, it } from "vitest";
import type { ControllerContext } from "../../api/api.types";
import type { User } from "../../users/users.types";
import getActiveTokenMatch from "../helpers/getActiveTokenMatch";

const user = { _id: new Types.ObjectId().toString() } as User;
const teamId = new Types.ObjectId().toString();
const tokenId = new Types.ObjectId().toString();

function makeContext(
  overrides: Partial<ControllerContext> = {},
): ControllerContext {
  return {
    req: {} as Request,
    res: {} as Response,
    user,
    activeTeam: teamId,
    ...overrides,
  };
}

describe("getActiveTokenMatch", () => {
  it("returns a match scoped to the active team's non-deleted token", () => {
    const { match } = getActiveTokenMatch(tokenId, makeContext());
    expect(match).toEqual({
      _id: tokenId,
      ref: teamId,
      refType: "team",
      isDeleted: false,
    });
  });

  it("returns the user from the context", () => {
    const result = getActiveTokenMatch(tokenId, makeContext());
    expect(result.user).toBe(user);
  });

  it("rejects when there is no active team", () => {
    expect(() =>
      getActiveTokenMatch(tokenId, makeContext({ activeTeam: null })),
    ).toThrow(expect.objectContaining({ statusCode: 400 }));
  });

  it("rejects when there is no user", () => {
    expect(() =>
      getActiveTokenMatch(tokenId, makeContext({ user: undefined })),
    ).toThrow(expect.objectContaining({ statusCode: 400 }));
  });

  it("rejects an invalid token id", () => {
    expect(() => getActiveTokenMatch("not-an-id", makeContext())).toThrow(
      expect.objectContaining({ statusCode: 404 }),
    );
  });
});
