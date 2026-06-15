import { describe, expect, it } from "vitest";
import extractPrimaryEmail from "../helpers/extractPrimaryEmail";

describe("extractPrimaryEmail", () => {
  it("prefers the primary email", () => {
    expect(
      extractPrimaryEmail([
        { primary: false, email: "secondary@example.com" },
        { primary: true, email: "primary@example.com" },
      ]),
    ).toBe("primary@example.com");
  });

  it("falls back to the first entry when none is primary", () => {
    expect(
      extractPrimaryEmail([
        { email: "first@example.com" },
        { email: "second@example.com" },
      ]),
    ).toBe("first@example.com");
  });

  it("trims surrounding whitespace", () => {
    expect(extractPrimaryEmail([{ primary: true, email: "  a@b.com  " }])).toBe(
      "a@b.com",
    );
  });

  it("returns null for a GitHub error object (non-array)", () => {
    expect(
      extractPrimaryEmail({
        message: "Bad credentials",
        documentation_url: "https://docs.github.com",
      }),
    ).toBeNull();
  });

  it("returns null for an empty array", () => {
    expect(extractPrimaryEmail([])).toBeNull();
  });

  it("returns null when entries are missing a string email", () => {
    expect(
      extractPrimaryEmail([{ primary: true }, { email: null }]),
    ).toBeNull();
  });

  it("returns null when the only email is empty or whitespace", () => {
    expect(extractPrimaryEmail([{ primary: true, email: "   " }])).toBeNull();
    expect(extractPrimaryEmail([{ primary: true, email: "" }])).toBeNull();
  });

  it("returns null for null or undefined input", () => {
    expect(extractPrimaryEmail(null)).toBeNull();
    expect(extractPrimaryEmail(undefined)).toBeNull();
  });
});
