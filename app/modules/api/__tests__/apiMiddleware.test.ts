import type { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import generateToken from "../../tokens/helpers/generateToken";
import { Token } from "../../tokens/tokens.model";
import { UserService } from "../../users/user";
import { hasApiKey } from "../api.middleware";

function makeReqRes(authorization?: string) {
  const req = { headers: { authorization } } as unknown as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as unknown as NextFunction;
  return { req, res, next };
}

function expect401(res: Response, next: NextFunction) {
  expect(next).not.toHaveBeenCalled();
  expect(res.status).toHaveBeenCalledWith(401);
  expect(res.json).toHaveBeenCalledWith({
    error: { message: "Valid API key required", statusCode: 401 },
  });
}

async function createApiKey(
  overrides: Record<string, unknown> = {},
  { isTeamMember = true } = {},
) {
  const teamId = new Types.ObjectId();
  const user = await UserService.create({
    username: "api-user",
    teams: isTeamMember ? [{ team: String(teamId), role: "ADMIN" }] : [],
  });
  const { token, hash, tokenPrefix } = generateToken();
  await Token.create({
    name: "CI",
    token: hash,
    tokenPrefix,
    ref: teamId,
    refType: "team",
    createdBy: user._id,
    ...overrides,
  });
  return token;
}

beforeEach(async () => {
  await clearDocumentDB();
});

describe("hasApiKey", () => {
  it("returns 401 when there is no Authorization header", async () => {
    const { req, res, next } = makeReqRes();
    await hasApiKey(req, res, next);
    expect401(res, next);
  });

  it("returns 401 when the scheme is not Bearer", async () => {
    const apiKey = await createApiKey();
    const { req, res, next } = makeReqRes(`Basic ${apiKey}`);
    await hasApiKey(req, res, next);
    expect401(res, next);
  });

  it("returns 401 when the Bearer key is empty", async () => {
    const { req, res, next } = makeReqRes("Bearer ");
    await hasApiKey(req, res, next);
    expect401(res, next);
  });

  it("returns 401 when the key does not match a token", async () => {
    const { req, res, next } = makeReqRes("Bearer sp_unknown");
    await hasApiKey(req, res, next);
    expect401(res, next);
  });

  it("returns 401 when the token is deleted", async () => {
    const apiKey = await createApiKey({ isDeleted: true });
    const { req, res, next } = makeReqRes(`Bearer ${apiKey}`);
    await hasApiKey(req, res, next);
    expect401(res, next);
  });

  it("returns 401 when the token has expired", async () => {
    const apiKey = await createApiKey({
      expiresAt: new Date(Date.now() - 1000),
    });
    const { req, res, next } = makeReqRes(`Bearer ${apiKey}`);
    await hasApiKey(req, res, next);
    expect401(res, next);
  });

  it("returns 401 when the token has no creator", async () => {
    const apiKey = await createApiKey({ createdBy: undefined });
    const { req, res, next } = makeReqRes(`Bearer ${apiKey}`);
    await hasApiKey(req, res, next);
    expect401(res, next);
  });

  it("returns 401 when the token's creator no longer exists", async () => {
    const apiKey = await createApiKey({ createdBy: new Types.ObjectId() });
    const { req, res, next } = makeReqRes(`Bearer ${apiKey}`);
    await hasApiKey(req, res, next);
    expect401(res, next);
  });

  it("returns 401 when the token's creator is no longer in the team", async () => {
    const apiKey = await createApiKey({}, { isTeamMember: false });
    const { req, res, next } = makeReqRes(`Bearer ${apiKey}`);
    await hasApiKey(req, res, next);
    expect401(res, next);
  });

  it("sets req.user to the token's creator and req.activeTeam to its team", async () => {
    const apiKey = await createApiKey();
    const { req, res, next } = makeReqRes(`Bearer ${apiKey}`);
    await hasApiKey(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.user?.username).toBe("api-user");
    expect(req.activeTeam).toBe(req.user?.teams[0].team);
  });

  it("calls next for a valid token", async () => {
    const apiKey = await createApiKey();
    const { req, res, next } = makeReqRes(`Bearer ${apiKey}`);
    await hasApiKey(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 429 when the token is over its rate limit", async () => {
    const apiKey = await createApiKey({
      rateLimitCount: 10,
      rateLimitWindowStart: new Date(),
    });
    const { req, res, next } = makeReqRes(`Bearer ${apiKey}`);
    await hasApiKey(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: "Rate limit exceeded", statusCode: 429 },
    });
  });

  it("calls next for a token that expires in the future", async () => {
    const apiKey = await createApiKey({
      expiresAt: new Date(Date.now() + 60_000),
    });
    const { req, res, next } = makeReqRes(`Bearer ${apiKey}`);
    await hasApiKey(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });
});
