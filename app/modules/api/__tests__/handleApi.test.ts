import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import handleApi from "../helpers/handleApi";

function makeReqRes(
  parsed: unknown = {},
  params: Record<string, unknown> = {},
) {
  const req = { params, user: undefined } as unknown as Request;
  const res = {
    locals: { parsed },
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as unknown as NextFunction;
  return { req, res, next };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("handleApi", () => {
  it("calls the controller with parsed body/query/files and json-encodes the return", async () => {
    const method = vi.fn().mockResolvedValue({ data: { ok: true } });
    const middleware = handleApi({ method });
    const { req, res, next } = makeReqRes({
      body: { name: "Alice" },
      query: { sort: "asc" },
      files: { upload: "blob" },
    });
    await middleware(req, res, next);
    expect(method).toHaveBeenCalledOnce();
    const [args, context] = method.mock.calls[0];
    expect(args.body).toEqual({ name: "Alice" });
    expect(args.query).toEqual({ sort: "asc" });
    expect(args.files).toEqual({ upload: "blob" });
    expect(context.req).toBe(req);
    expect(context.res).toBe(res);
    expect(res.json).toHaveBeenCalledWith({ data: { ok: true } });
  });

  it("passes the active team in the controller context", async () => {
    const teamId = "aaaaaaaaaaaaaaaaaaaaaaaa";
    const method = vi.fn().mockResolvedValue({ data: "ok" });
    const middleware = handleApi({ method });
    const { req, res, next } = makeReqRes();
    Object.assign(req, {
      user: { teams: [{ team: teamId }] },
      query: { teamId },
    });
    await middleware(req, res, next);
    const [, context] = method.mock.calls[0];
    expect(context.activeTeam).toBe(teamId);
  });

  it("extracts a named path param", async () => {
    const method = vi.fn().mockResolvedValue({ data: "ok" });
    const middleware = handleApi({ param: "id", method });
    const { req, res, next } = makeReqRes({}, { id: "abc123" });
    await middleware(req, res, next);
    const [args] = method.mock.calls[0];
    expect(args.param).toBe("abc123");
  });

  it("takes the first element when the param is an array", async () => {
    const method = vi.fn().mockResolvedValue({ data: "ok" });
    const middleware = handleApi({ param: "id", method });
    const { req, res, next } = makeReqRes({}, { id: ["first", "second"] });
    await middleware(req, res, next);
    expect(method.mock.calls[0][0].param).toBe("first");
  });

  it("omits param when the route declares one but req has none", async () => {
    const method = vi.fn().mockResolvedValue({ data: "ok" });
    const middleware = handleApi({ param: "id", method });
    const { req, res, next } = makeReqRes({}, {});
    await middleware(req, res, next);
    expect(method.mock.calls[0][0].param).toBeUndefined();
  });

  it("passes props through to the controller args", async () => {
    const method = vi.fn().mockResolvedValue({ data: "ok" });
    const middleware = handleApi({ props: { tenant: "acme" }, method });
    const { req, res, next } = makeReqRes();
    await middleware(req, res, next);
    expect(method.mock.calls[0][0].props).toEqual({ tenant: "acme" });
  });

  it("returns the error's statusCode and message for statusCode errors", async () => {
    const method = vi.fn().mockRejectedValue({
      statusCode: 404,
      message: "Not found",
    });
    const middleware = handleApi({ method });
    const { req, res, next } = makeReqRes();
    await middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: "Not found", statusCode: 404 },
    });
  });

  it("returns 500 and the error message for plain Errors", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const method = vi.fn().mockRejectedValue(new Error("boom"));
    const middleware = handleApi({ method });
    const { req, res, next } = makeReqRes();
    await middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: "boom", statusCode: 500 },
    });
  });

  it("returns 500 for non-Error thrown values", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const method = vi.fn().mockRejectedValue("something bad");
    const middleware = handleApi({ method });
    const { req, res, next } = makeReqRes();
    await middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: "something bad", statusCode: 500 },
    });
  });

  it("falls through cleanly when res.locals.parsed is undefined", async () => {
    const method = vi.fn().mockResolvedValue({ data: "ok" });
    const middleware = handleApi({ method });
    const { req, res, next } = makeReqRes(undefined);
    await middleware(req, res, next);
    const [args] = method.mock.calls[0];
    expect(args.body).toEqual({});
    expect(args.query).toEqual({});
    expect(args.files).toEqual({});
    expect(res.json).toHaveBeenCalledWith({ data: "ok" });
  });

  it("500s when the controller returns a value without a data key", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const method = vi.fn().mockResolvedValue({ ok: true });
    const middleware = handleApi({ method });
    const { req, res, next } = makeReqRes();
    await middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: "Server returned malformed response",
        statusCode: 500,
      },
    });
  });

  it("500s when the controller returns null", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const method = vi.fn().mockResolvedValue(null);
    const middleware = handleApi({ method });
    const { req, res, next } = makeReqRes();
    await middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: "Server returned malformed response",
        statusCode: 500,
      },
    });
  });

  it("500s when the controller returns a non-object", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const method = vi.fn().mockResolvedValue("just a string");
    const middleware = handleApi({ method });
    const { req, res, next } = makeReqRes();
    await middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: "Server returned malformed response",
        statusCode: 500,
      },
    });
  });
});
