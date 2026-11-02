import { describe, expect, it } from "vitest";
import getTotalPages from "../getTotalPages";

describe("getTotalPages", () => {
  it("returns 1 when there are no items", () => {
    expect(getTotalPages(0)).toBe(1);
  });

  it("returns 1 when the count fits on one page", () => {
    expect(getTotalPages(1)).toBe(1);
    expect(getTotalPages(20)).toBe(1);
  });

  it("rounds up a partial page", () => {
    expect(getTotalPages(21)).toBe(2);
    expect(getTotalPages(41)).toBe(3);
  });

  it("returns an exact number of full pages", () => {
    expect(getTotalPages(40)).toBe(2);
  });

  it("uses a custom pagination amount", () => {
    expect(getTotalPages(25, 10)).toBe(3);
    expect(getTotalPages(0, 10)).toBe(1);
  });
});
