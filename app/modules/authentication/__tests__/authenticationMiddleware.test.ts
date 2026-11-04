import type { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserService } from "~/modules/users/user";
import type { User } from "~/modules/users/users.types";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import loginUser from "../../../../test/helpers/loginUser";
import { isAuthenticated, setUser } from "../authentication.middleware";

function makeReqRes(cookie?: string) {
  const req = { headers: { cookie } } as unknown as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as unknown as NextFunction;
  return { req, res, next };
}

beforeEach(async () => {
  await clearDocumentDB();
});

describe("setUser", () => {
  it("leaves req.user unset when there is no cookie", async () => {
    const { req, res, next } = makeReqRes();
    await setUser(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toBeUndefined();
  });

  it("leaves req.user unset when the session cookie is invalid", async () => {
    const { req, res, next } = makeReqRes("__session=tampered");
    await setUser(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toBeUndefined();
  });

  it("leaves req.user unset when the session user no longer exists", async () => {
    const cookie = await loginUser(new Types.ObjectId().toString());
    const { req, res, next } = makeReqRes(cookie);
    await setUser(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toBeUndefined();
  });

  it("sets req.user for a valid session", async () => {
    const user = await UserService.create({ username: "test_user" });
    const cookie = await loginUser(user._id);
    const { req, res, next } = makeReqRes(cookie);
    await setUser(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.user?._id).toEqual(user._id);
  });
});

describe("isAuthenticated", () => {
  it("returns 401 when req.user is not set", () => {
    const { req, res, next } = makeReqRes();
    isAuthenticated(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: "Authentication required", statusCode: 401 },
    });
  });

  it("calls next when req.user is set", () => {
    const { req, res, next } = makeReqRes();
    req.user = { _id: "user1" } as User;
    isAuthenticated(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});
