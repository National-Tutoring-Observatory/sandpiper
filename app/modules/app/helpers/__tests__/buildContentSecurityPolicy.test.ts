import { describe, expect, it } from "vitest";
import buildContentSecurityPolicy from "../buildContentSecurityPolicy";

describe("buildContentSecurityPolicy", () => {
  const nonce = "abc123==";
  const directives = (policy: string) =>
    Object.fromEntries(
      policy
        .split(";")
        .map((d) => d.trim())
        .filter(Boolean)
        .map((d) => {
          const [name, ...rest] = d.split(/\s+/);
          return [name, rest];
        }),
    );

  it("includes the nonce in script-src and never 'unsafe-inline'", () => {
    const policy = buildContentSecurityPolicy(nonce);
    const scriptSrc = directives(policy)["script-src"];

    expect(scriptSrc).toContain(`'nonce-${nonce}'`);
    expect(scriptSrc).toContain("'self'");
    expect(scriptSrc).toContain("https://www.googletagmanager.com");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });

  it("keeps 'unsafe-inline' in style-src for the shadcn chart component", () => {
    const styleSrc = directives(buildContentSecurityPolicy(nonce))["style-src"];

    expect(styleSrc).toContain("'unsafe-inline'");
    expect(styleSrc).toContain("https://fonts.googleapis.com");
  });

  it("locks down default-src, object-src, base-uri and form-action", () => {
    const d = directives(buildContentSecurityPolicy(nonce));

    expect(d["default-src"]).toEqual(["'self'"]);
    expect(d["object-src"]).toEqual(["'none'"]);
    expect(d["base-uri"]).toEqual(["'self'"]);
    expect(d["form-action"]).toEqual(["'self'"]);
  });

  it("sets frame-ancestors 'self' to prevent clickjacking", () => {
    const d = directives(buildContentSecurityPolicy(nonce));

    expect(d["frame-ancestors"]).toEqual(["'self'"]);
    expect(d["frame-src"]).toEqual(["'self'"]);
  });

  it("allows analytics beacons and fonts in connect-src / font-src / img-src", () => {
    const d = directives(buildContentSecurityPolicy(nonce));

    expect(d["connect-src"]).toContain("'self'");
    expect(d["connect-src"]).toContain("https://www.google-analytics.com");
    expect(d["font-src"]).toContain("https://fonts.gstatic.com");
    expect(d["img-src"]).toContain("data:");
  });

  it("wires the violation reporting endpoint", () => {
    const d = directives(buildContentSecurityPolicy(nonce));

    expect(d["report-uri"]).toEqual(["/api/csp-report"]);
    expect(d["report-to"]).toEqual(["csp-endpoint"]);
  });

  it("produces a distinct nonce-bound policy per call", () => {
    expect(buildContentSecurityPolicy("one")).not.toEqual(
      buildContentSecurityPolicy("two"),
    );
  });
});
