import { afterEach, beforeEach, describe, expect, it } from "vitest";
import securityHeadersEnabled from "../securityHeadersEnabled";

describe("securityHeadersEnabled", () => {
  let originalNodeEnv: string | undefined;
  let originalFlag: string | undefined;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    originalFlag = process.env.ENABLE_SECURITY_HEADERS;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalFlag === undefined) delete process.env.ENABLE_SECURITY_HEADERS;
    else process.env.ENABLE_SECURITY_HEADERS = originalFlag;
  });

  it("is on in production", () => {
    process.env.NODE_ENV = "production";
    delete process.env.ENABLE_SECURITY_HEADERS;
    expect(securityHeadersEnabled()).toBe(true);
  });

  it("is off in development by default", () => {
    process.env.NODE_ENV = "development";
    delete process.env.ENABLE_SECURITY_HEADERS;
    expect(securityHeadersEnabled()).toBe(false);
  });

  it("can be forced on in non-production via ENABLE_SECURITY_HEADERS for e2e", () => {
    process.env.NODE_ENV = "development";
    process.env.ENABLE_SECURITY_HEADERS = "true";
    expect(securityHeadersEnabled()).toBe(true);
  });

  it("ignores values other than 'true'", () => {
    process.env.NODE_ENV = "development";
    process.env.ENABLE_SECURITY_HEADERS = "1";
    expect(securityHeadersEnabled()).toBe(false);
  });
});
