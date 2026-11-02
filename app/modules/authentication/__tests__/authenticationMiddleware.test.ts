import type { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserService } from "~/modules/users/user";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import loginUser from "../../../../test/helpers/loginUser";
import { isAuthenticated } from "../authentication.middleware";

function makeReqRes(cookie?: string) {
  const req = { headers: { cookie } } as unknown as Request;
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
    error: { message: "Authentication required", statusCode: 401 },
  });
}

beforeEach(async () => {
  await clearDocumentDB();
});

describe("isAuthenticated", () => {
  it("returns 401 when there is no cookie", async () => {
    const { req, res, next } = makeReqRes();
    await isAuthenticated(req, res, next);
    expect401(res, next);
  });

  it("returns 401 when the session cookie is invalid", async () => {
    const { req, res, next } = makeReqRes("__session=tampered");
    await isAuthenticated(req, res, next);
    expect401(res, next);
  });

  it("returns 401 when the session user no longer exists", async () => {
    const cookie = await loginUser(new Types.ObjectId().toString());
    const { req, res, next } = makeReqRes(cookie);
    await isAuthenticated(req, res, next);
    expect401(res, next);
  });

  it("sets req.user and calls next for a valid session", async () => {
    const user = await UserService.create({ username: "test_user" });
    const cookie = await loginUser(user._id);
    const { req, res, next } = makeReqRes(cookie);
    await isAuthenticated(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
    expect(req.user?._id).toEqual(user._id);
  });
});
