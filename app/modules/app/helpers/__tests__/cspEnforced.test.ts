import { afterEach, beforeEach, describe, expect, it } from "vitest";
import cspEnforced from "../cspEnforced";

describe("cspEnforced", () => {
  let original: string | undefined;

  beforeEach(() => {
    original = process.env.CSP_ENFORCE;
  });

  afterEach(() => {
    if (original === undefined) delete process.env.CSP_ENFORCE;
    else process.env.CSP_ENFORCE = original;
  });

  it("defaults to report-only (false) when unset", () => {
    delete process.env.CSP_ENFORCE;
    expect(cspEnforced()).toBe(false);
  });

  it("enforces (blocks) when CSP_ENFORCE is 'true'", () => {
    process.env.CSP_ENFORCE = "true";
    expect(cspEnforced()).toBe(true);
  });

  it("ignores values other than 'true'", () => {
    process.env.CSP_ENFORCE = "1";
    expect(cspEnforced()).toBe(false);
  });
});
