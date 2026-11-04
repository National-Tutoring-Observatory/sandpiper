import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import handleValidation from "../helpers/handleValidation";

function makeReqRes(
  body: unknown = {},
  query: unknown = {},
  files: unknown = {},
) {
  const req = { body, query, files } as unknown as Request;
  const res = {
    locals: {} as Record<string, unknown>,
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as unknown as NextFunction;
  return { req, res, next };
}

describe("handleValidation", () => {
  it("calls next and stores parsed body on res.locals when valid", () => {
    const middleware = handleValidation({
      body: { name: z.string(), age: z.number() },
    });
    const { req, res, next } = makeReqRes({ name: "Alice", age: 30 });
    middleware(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.locals.parsed).toEqual({
      body: { name: "Alice", age: 30 },
      query: {},
      files: {},
    });
  });

  it("rejects fields not declared in the schema", () => {
    const middleware = handleValidation({
      body: { name: z.string() },
    });
    const { req, res, next } = makeReqRes({
      name: "Alice",
      extra: "unexpected",
    });
    middleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    const [payload] = vi.mocked(res.json).mock.calls[0];
    expect(payload.error.issues[0]).toMatchObject({
      code: "unrecognized_keys",
      keys: ["extra"],
    });
  });

  it("names every undeclared field, not just the first", () => {
    const middleware = handleValidation({
      body: { name: z.string().optional() },
    });
    const { req, res, next } = makeReqRes({
      startDate: "2026-08-30",
      teamsCount: "24",
    });
    middleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    const [payload] = vi.mocked(res.json).mock.calls[0];
    expect(payload.error.issues[0].keys).toEqual(["startDate", "teamsCount"]);
  });

  it("rejects query parameters not declared in the schema", () => {
    const middleware = handleValidation({
      query: { sort: z.enum(["asc", "desc"]) },
    });
    const { req, res, next } = makeReqRes({}, { sort: "asc", page: "2" });
    middleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("leaves a part of the request alone when it declares no shape", () => {
    const middleware = handleValidation({
      body: { name: z.string() },
    });
    const { req, res, next } = makeReqRes(
      { name: "Alice" },
      { anything: "goes" },
    );
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.locals.parsed).toEqual({
      body: { name: "Alice" },
      query: {},
      files: {},
    });
  });

  it("returns 400 with structured issues when body is invalid", () => {
    const middleware = handleValidation({
      body: { name: z.string() },
    });
    const { req, res, next } = makeReqRes({ name: 123 });
    middleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    const [payload] = vi.mocked(res.json).mock.calls[0];
    expect(payload).toMatchObject({
      error: { message: "Validation failed", statusCode: 400 },
    });
    expect(payload.error.issues).toBeInstanceOf(Array);
    expect(payload.error.issues.length).toBeGreaterThan(0);
  });

  it("validates query parameters", () => {
    const middleware = handleValidation({
      query: { sort: z.enum(["asc", "desc"]) },
    });
    const { req, res, next } = makeReqRes({}, { sort: "asc" });
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.locals.parsed).toEqual({
      body: {},
      query: { sort: "asc" },
      files: {},
    });
  });

  it("rejects invalid query parameters", () => {
    const middleware = handleValidation({
      query: { sort: z.enum(["asc", "desc"]) },
    });
    const { req, res, next } = makeReqRes({}, { sort: "sideways" });
    middleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("skips validation when shouldSkipValidation is true", () => {
    const middleware = handleValidation({
      body: { name: z.string() },
      shouldSkipValidation: true,
    });
    const { req, res, next } = makeReqRes({ name: 123 });
    middleware(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.locals.parsed).toBeUndefined();
  });

  it("does nothing when no schemas are provided", () => {
    const middleware = handleValidation({});
    const { req, res, next } = makeReqRes({ random: "data" });
    middleware(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.locals.parsed).toEqual({ body: {}, query: {}, files: {} });
  });

  it("ignores empty schema field maps", () => {
    const middleware = handleValidation({ body: {}, query: {} });
    const { req, res, next } = makeReqRes({ x: 1 });
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.locals.parsed).toEqual({ body: {}, query: {}, files: {} });
  });

  it("combines body and query validation", () => {
    const middleware = handleValidation({
      body: { name: z.string() },
      query: { limit: z.string() },
    });
    const { req, res, next } = makeReqRes({ name: "Alice" }, { limit: "10" });
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.locals.parsed).toEqual({
      body: { name: "Alice" },
      query: { limit: "10" },
      files: {},
    });
  });
});
