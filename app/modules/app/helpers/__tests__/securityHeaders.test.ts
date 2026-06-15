import { describe, expect, it } from "vitest";
import securityHeaders from "../securityHeaders";

describe("securityHeaders", () => {
  it("sets HSTS for at least one year including subdomains", () => {
    const value = securityHeaders()["Strict-Transport-Security"];

    expect(value).toContain("includeSubDomains");
    const maxAge = Number(value.match(/max-age=(\d+)/)?.[1]);
    expect(maxAge).toBeGreaterThanOrEqual(31536000);
  });

  it("disables MIME sniffing", () => {
    expect(securityHeaders()["X-Content-Type-Options"]).toBe("nosniff");
  });

  it("sets a privacy-preserving Referrer-Policy", () => {
    expect(securityHeaders()["Referrer-Policy"]).toBe(
      "strict-origin-when-cross-origin",
    );
  });
});
