import express, { type RequestHandler } from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { ControllerMethod } from "../api.types";
import ROUTES from "../apis";
import getApis from "../helpers/getApis";
import registerApi from "../helpers/registerApi";

let server: Server | undefined;

async function startApp(): Promise<string> {
  const app = express();
  getApis(app);
  server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

const respondWith =
  (data: unknown): ControllerMethod =>
  async () => ({ data });

beforeEach(() => {
  ROUTES.length = 0;
});

afterEach(async () => {
  await new Promise((resolve) => server?.close(resolve));
  server = undefined;
});

describe("getApis", () => {
  it("mounts each operation on its HTTP method and path", async () => {
    registerApi({
      basePath: "/things",
      controller: {
        list: respondWith("list"),
        create: respondWith("create"),
        read: respondWith("read"),
        update: respondWith("update"),
        delete: respondWith("delete"),
      },
      list: {},
      create: {},
      read: { param: "id" },
      update: { param: "id" },
      delete: { param: "id" },
    });
    const baseUrl = await startApp();

    const cases = [
      ["GET", "/api/things", "list"],
      ["POST", "/api/things", "create"],
      ["GET", "/api/things/123", "read"],
      ["PUT", "/api/things/123", "update"],
      ["DELETE", "/api/things/123", "delete"],
    ];
    for (const [method, path, expected] of cases) {
      const res = await fetch(`${baseUrl}${path}`, { method });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: expected });
    }
  });

  it("passes the path param to the controller", async () => {
    const read = vi.fn(respondWith("ok"));
    registerApi({
      basePath: "/things",
      controller: { read },
      read: { param: "id" },
    });
    const baseUrl = await startApp();

    await fetch(`${baseUrl}/api/things/abc123`);
    expect(read.mock.calls[0][0].param).toBe("abc123");
  });

  it("does not mount an operation that has no controller method", async () => {
    registerApi({
      basePath: "/things",
      controller: { list: respondWith("list") },
      list: {},
      create: {},
    });
    const baseUrl = await startApp();

    const res = await fetch(`${baseUrl}/api/things`, { method: "POST" });
    expect(res.status).toBe(404);
  });

  it("does not mount an operation that is not declared", async () => {
    registerApi({
      basePath: "/things",
      controller: { list: respondWith("list"), create: respondWith("create") },
      list: {},
    });
    const baseUrl = await startApp();

    const res = await fetch(`${baseUrl}/api/things`, { method: "POST" });
    expect(res.status).toBe(404);
  });

  it("runs route middleware before the controller", async () => {
    const block: RequestHandler = (_req, res) => {
      res.status(401).json({ blocked: true });
    };
    const list = vi.fn(respondWith("list"));
    registerApi({
      basePath: "/things",
      controller: { list },
      list: { middleware: [block] },
    });
    const baseUrl = await startApp();

    const res = await fetch(`${baseUrl}/api/things`);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ blocked: true });
    expect(list).not.toHaveBeenCalled();
  });

  it("validates the request before the controller", async () => {
    const list = vi.fn(respondWith("list"));
    registerApi({
      basePath: "/things",
      controller: { list },
      list: { query: { sort: z.enum(["asc", "desc"]) } },
    });
    const baseUrl = await startApp();

    const res = await fetch(`${baseUrl}/api/things?sort=sideways`);
    expect(res.status).toBe(400);
    expect(list).not.toHaveBeenCalled();
  });

  it("returns 429 once the rate limit is reached", async () => {
    registerApi({
      basePath: "/things",
      controller: { list: respondWith("list") },
      list: { rateLimit: 1 },
    });
    const baseUrl = await startApp();

    expect((await fetch(`${baseUrl}/api/things`)).status).toBe(200);
    const res = await fetch(`${baseUrl}/api/things`);
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({
      message: "Too many requests, please try again later.",
      statusCode: 429,
    });
  });

  it("skips the rate limit when shouldSkipRateLimit is set", async () => {
    registerApi({
      basePath: "/things",
      controller: { list: respondWith("list") },
      list: { rateLimit: 1, shouldSkipRateLimit: true },
    });
    const baseUrl = await startApp();

    await fetch(`${baseUrl}/api/things`);
    expect((await fetch(`${baseUrl}/api/things`)).status).toBe(200);
  });

  it("adds CORS headers when hasCors is set", async () => {
    registerApi({
      basePath: "/things",
      controller: { list: respondWith("list") },
      list: { hasCors: true },
    });
    const baseUrl = await startApp();

    const res = await fetch(`${baseUrl}/api/things`, {
      headers: { Origin: "http://example.com" },
    });
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("does not add CORS headers by default", async () => {
    registerApi({
      basePath: "/things",
      controller: { list: respondWith("list") },
      list: {},
    });
    const baseUrl = await startApp();

    const res = await fetch(`${baseUrl}/api/things`, {
      headers: { Origin: "http://example.com" },
    });
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });
});
