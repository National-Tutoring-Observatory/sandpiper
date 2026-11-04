import { describe, expect, it } from "vitest";
import generateToken from "../helpers/generateToken";
import hashToken from "../helpers/hashToken";

describe("generateToken", () => {
  it("returns an sp_ prefixed token", () => {
    const { token } = generateToken();
    expect(token).toMatch(/^sp_[A-Za-z0-9_-]{43}$/);
  });

  it("returns the hash of the token", () => {
    const { token, hash } = generateToken();
    expect(hash).toBe(hashToken(token));
  });

  it("returns the first 11 characters as the token prefix", () => {
    const { token, tokenPrefix } = generateToken();
    expect(tokenPrefix).toHaveLength(11);
    expect(token.startsWith(tokenPrefix)).toBe(true);
  });

  it("returns a different token each time", () => {
    expect(generateToken().token).not.toBe(generateToken().token);
  });
});
