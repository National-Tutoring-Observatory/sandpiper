import { describe, expect, it } from "vitest";
import getModelPaginationByCurrentPage from "../getModelPaginationByCurrentPage";

describe("getModelPaginationByCurrentPage", () => {
  it("skips nothing on the first page", () => {
    expect(getModelPaginationByCurrentPage(1, {})).toEqual({
      skip: 0,
      limit: 20,
    });
  });

  it("skips the previous pages", () => {
    expect(getModelPaginationByCurrentPage(3, {})).toEqual({
      skip: 40,
      limit: 20,
    });
  });

  it("uses a custom pagination amount", () => {
    expect(getModelPaginationByCurrentPage(2, {}, 10)).toEqual({
      skip: 10,
      limit: 10,
    });
  });

  it("keeps existing options", () => {
    expect(
      getModelPaginationByCurrentPage(2, { sort: { createdAt: -1 } }),
    ).toEqual({ sort: { createdAt: -1 }, skip: 20, limit: 20 });
  });

  it("returns the same options object it was given", () => {
    const options = {};
    expect(getModelPaginationByCurrentPage(1, options)).toBe(options);
  });
});
