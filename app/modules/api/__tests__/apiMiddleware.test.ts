import type { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import generateToken from "../../tokens/helpers/generateToken";
import { Token } from "../../tokens/tokens.model";
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

async function createApiKey(overrides: Record<string, unknown> = {}) {
  const { token, hash, tokenPrefix } = generateToken();
  await Token.create({
    name: "CI",
    token: hash,
    tokenPrefix,
    ref: new Types.ObjectId(),
    refType: "team",
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

  it("calls next for a valid token", async () => {
    const apiKey = await createApiKey();
    const { req, res, next } = makeReqRes(`Bearer ${apiKey}`);
    await hasApiKey(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
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
