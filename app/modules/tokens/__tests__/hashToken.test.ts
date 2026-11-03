import { describe, expect, it } from "vitest";
import hashToken from "../helpers/hashToken";

describe("hashToken", () => {
  it("returns the sha256 hex digest", () => {
    expect(hashToken("sp_abc")).toMatch(/^[a-f0-9]{64}$/);
  });

  it("returns the same hash for the same token", () => {
    expect(hashToken("sp_abc")).toBe(hashToken("sp_abc"));
  });

  it("returns a different hash for a different token", () => {
    expect(hashToken("sp_abc")).not.toBe(hashToken("sp_abd"));
  });
});
