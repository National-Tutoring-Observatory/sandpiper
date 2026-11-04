import { beforeEach, describe, expect, it } from "vitest";
import type { ControllerMethod } from "../api.types";
import ROUTES from "../apis";
import registerApi from "../helpers/registerApi";

const noopController: ControllerMethod = async () => ({ data: undefined });

beforeEach(() => {
  ROUTES.length = 0;
});

describe("registerApi", () => {
  it("registers a single route into ROUTES", () => {
    registerApi({
      basePath: "/test",
      controller: { list: noopController },
      list: {},
    });
    expect(ROUTES).toHaveLength(1);
    expect(ROUTES[0]?.basePath).toBe("/test");
  });

  it("registers each route when given an array", () => {
    registerApi([
      { basePath: "/a", controller: { list: noopController }, list: {} },
      { basePath: "/b", controller: { list: noopController }, list: {} },
    ]);
    expect(ROUTES).toHaveLength(2);
    expect(ROUTES.map((r) => r.basePath)).toEqual(["/a", "/b"]);
  });

  it("applies defaults via setDefaults on each declared operation", () => {
    registerApi({
      basePath: "/test",
      controller: { list: noopController },
      list: {},
    });
    const op = ROUTES[0]?.list;
    expect(op?.param).toBe("");
    expect(op?.body).toEqual({});
    expect(op?.query).toEqual({});
    expect(op?.files).toEqual({});
    expect(op?.middleware).toEqual([]);
    expect(op?.props).toEqual({});
    expect(op?.hasCors).toBe(false);
    expect(op?.shouldSkipValidation).toBe(false);
    expect(op?.shouldSkipRateLimit).toBe(false);
  });

  it("uses the read-tier rate limit (2000) for list and read", () => {
    registerApi({
      basePath: "/test",
      controller: { list: noopController, read: noopController },
      list: {},
      read: { param: "id" },
    });
    expect(ROUTES[0]?.list?.rateLimit).toBe(2000);
    expect(ROUTES[0]?.read?.rateLimit).toBe(2000);
  });

  it("uses the write-tier rate limit (200) for create/update/delete", () => {
    registerApi({
      basePath: "/test",
      controller: {
        create: noopController,
        update: noopController,
        delete: noopController,
      },
      create: {},
      update: { param: "id" },
      delete: { param: "id" },
    });
    expect(ROUTES[0]?.create?.rateLimit).toBe(200);
    expect(ROUTES[0]?.update?.rateLimit).toBe(200);
    expect(ROUTES[0]?.delete?.rateLimit).toBe(200);
  });

  it("preserves an explicit rateLimit override", () => {
    registerApi({
      basePath: "/test",
      controller: { list: noopController },
      list: { rateLimit: 50 },
    });
    expect(ROUTES[0]?.list?.rateLimit).toBe(50);
  });

  it("leaves undeclared operations untouched", () => {
    registerApi({
      basePath: "/test",
      controller: { list: noopController },
      list: {},
    });
    expect(ROUTES[0]?.create).toBeUndefined();
    expect(ROUTES[0]?.update).toBeUndefined();
    expect(ROUTES[0]?.delete).toBeUndefined();
  });
});
