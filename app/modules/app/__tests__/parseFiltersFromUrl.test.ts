import { describe, expect, it } from "vitest";
import {
  buildFilterSearchParams,
  coerceClearedArrayFilters,
  parseFiltersFromUrl,
} from "../hooks/useSearchQueryParams";

const params = (query: string) => new URLSearchParams(query);

describe("parseFiltersFromUrl", () => {
  describe("no filters in the URL", () => {
    it("returns an empty object when there are no defaults", () => {
      expect(parseFiltersFromUrl(params(""))).toEqual({});
    });

    it("falls back to the provided defaults", () => {
      expect(parseFiltersFromUrl(params(""), { status: "RUNNING" })).toEqual({
        status: "RUNNING",
      });
    });

    it("seeds array-typed defaults as an empty array", () => {
      expect(parseFiltersFromUrl(params(""), { tags: [] })).toEqual({
        tags: [],
      });
    });

    it("keeps scalar defaults alongside array defaults", () => {
      expect(
        parseFiltersFromUrl(params(""), { tags: [], status: "RUNNING" }),
      ).toEqual({ tags: [], status: "RUNNING" });
    });
  });

  describe("filters present in the URL", () => {
    it("reads a single-value (scalar) filter as a string", () => {
      expect(parseFiltersFromUrl(params("filter_status=RUNNING"))).toEqual({
        status: "RUNNING",
      });
    });

    it("reads a repeated array-typed filter as an array", () => {
      expect(
        parseFiltersFromUrl(params("filter_tags=a&filter_tags=b"), {
          tags: [],
        }),
      ).toEqual({ tags: ["a", "b"] });
    });

    it("reads a single occurrence of an array-typed filter as an array", () => {
      expect(
        parseFiltersFromUrl(params("filter_tags=a"), { tags: [] }),
      ).toEqual({ tags: ["a"] });
    });

    it("seeds untouched array filters as empty while overlaying URL values", () => {
      expect(
        parseFiltersFromUrl(params("filter_status=RUNNING"), {
          tags: [],
          status: "COMPLETE",
        }),
      ).toEqual({ tags: [], status: "RUNNING" });
    });

    it("does not re-apply scalar defaults once the URL has filters", () => {
      // status default must not leak back in when another filter is set
      expect(
        parseFiltersFromUrl(params("filter_tags=a"), {
          tags: [],
          status: "RUNNING",
        }),
      ).toEqual({ tags: ["a"] });
    });
  });

  describe("prefix namespacing", () => {
    it("only reads params matching the prefixed filter key", () => {
      expect(
        parseFiltersFromUrl(
          params("runsFilter_status=RUNNING&filter_status=IGNORED"),
          { status: "" },
          "runs",
        ),
      ).toEqual({ status: "RUNNING" });
    });
  });
});

// Read the filter params back out as a sorted list for stable assertions.
const filterEntries = (searchParams: URLSearchParams, prefix = "") => {
  const filterPrefix = prefix ? `${prefix}Filter_` : "filter_";
  const entries: [string, string][] = [];
  searchParams.forEach((value, key) => {
    if (key.startsWith(filterPrefix)) entries.push([key, value]);
  });
  return entries.sort((a, b) => (a[0] + a[1]).localeCompare(b[0] + b[1]));
};

describe("buildFilterSearchParams", () => {
  it("writes a scalar filter as a single param", () => {
    const result = buildFilterSearchParams(params(""), { status: "RUNNING" });
    expect(filterEntries(result)).toEqual([["filter_status", "RUNNING"]]);
  });

  it("writes an array filter as repeated params", () => {
    const result = buildFilterSearchParams(params(""), { tags: ["a", "b"] });
    expect(filterEntries(result)).toEqual([
      ["filter_tags", "a"],
      ["filter_tags", "b"],
    ]);
  });

  it("omits empty arrays, nulls and empty strings", () => {
    const result = buildFilterSearchParams(params(""), {
      tags: [],
      status: null,
      type: "",
    });
    expect(filterEntries(result)).toEqual([]);
  });

  it("skips empty entries within an array", () => {
    const result = buildFilterSearchParams(params(""), { tags: ["a", ""] });
    expect(filterEntries(result)).toEqual([["filter_tags", "a"]]);
  });

  it("clears previously-set filter params before writing", () => {
    const result = buildFilterSearchParams(params("filter_tags=old"), {
      tags: ["new"],
    });
    expect(filterEntries(result)).toEqual([["filter_tags", "new"]]);
  });

  it("preserves non-filter params", () => {
    const result = buildFilterSearchParams(
      params("searchValue=hello&filter_tags=old"),
      { status: "RUNNING" },
    );
    expect(result.get("searchValue")).toBe("hello");
    expect(filterEntries(result)).toEqual([["filter_status", "RUNNING"]]);
  });

  it("namespaces params with the given prefix", () => {
    const result = buildFilterSearchParams(params(""), { tags: ["a"] }, "runs");
    expect(filterEntries(result, "runs")).toEqual([["runsFilter_tags", "a"]]);
  });

  it("round-trips with parseFiltersFromUrl", () => {
    const written = buildFilterSearchParams(params(""), {
      tags: ["a", "b"],
      status: "RUNNING",
    });
    expect(parseFiltersFromUrl(written, { tags: [], status: "" })).toEqual({
      tags: ["a", "b"],
      status: "RUNNING",
    });
  });
});

describe("coerceClearedArrayFilters", () => {
  it("turns a null array filter into an empty array", () => {
    expect(coerceClearedArrayFilters({ tags: null }, ["tags"])).toEqual({
      tags: [],
    });
  });

  it("turns an undefined array filter into an empty array", () => {
    expect(coerceClearedArrayFilters({}, ["tags"])).toEqual({ tags: [] });
  });

  it("leaves populated array filters untouched", () => {
    expect(coerceClearedArrayFilters({ tags: ["a"] }, ["tags"])).toEqual({
      tags: ["a"],
    });
  });

  it("does not coerce scalar filters", () => {
    expect(coerceClearedArrayFilters({ status: null }, ["tags"])).toEqual({
      status: null,
      tags: [],
    });
  });
});
