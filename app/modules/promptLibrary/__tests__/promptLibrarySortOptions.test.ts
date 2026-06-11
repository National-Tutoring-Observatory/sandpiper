import { describe, expect, it } from "vitest";
import promptLibrarySortOptions from "../helpers/promptLibrarySortOptions";

// SortItem prepends "-" for the descending toggle, so option values must be
// bare field names. A leading "-" here produces "--field" on descending, which
// buildQueryFromParams rejects as an invalid sort field.
describe("promptLibrarySortOptions", () => {
  it("uses bare field names (no leading '-')", () => {
    for (const option of promptLibrarySortOptions) {
      expect(option.value.startsWith("-")).toBe(false);
    }
  });
});
