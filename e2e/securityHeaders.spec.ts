import { expect, test } from "@playwright/test";

// These assertions require the security headers to be active. They are always
// on in production (the e2e CI workflow builds + runs with NODE_ENV=production).
// To run this spec against a local dev server, start it with
// `ENABLE_SECURITY_HEADERS=true yarn app:dev`.
// Reads whichever CSP header is active — report-only by default, or the
// enforcing header when CSP_ENFORCE=true.
const cspHeader = (headers: Record<string, string>) =>
  headers["content-security-policy-report-only"] ??
  headers["content-security-policy"];

test.describe("security headers", () => {
  test("serves a CSP whose nonce matches the document scripts", async ({
    request,
  }) => {
    const response = await request.get("/");
    expect(response.ok()).toBeTruthy();

    const csp = cspHeader(response.headers());
    expect(
      csp,
      "CSP header missing — run the server in production mode or with ENABLE_SECURITY_HEADERS=true",
    ).toBeTruthy();

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain("report-uri /api/csp-report");
    // The whole point of the policy: no inline-script escape hatch.
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);

    const nonce = csp.match(/'nonce-([^']+)'/)?.[1];
    expect(nonce, "CSP must carry a per-request nonce").toBeTruthy();

    // The nonce in the header must match the one React Router stamped on the
    // SSR <script> tags, otherwise hydration would be blocked once enforced.
    const html = await response.text();
    expect(html).toContain(`nonce="${nonce}"`);

    // Confirm the nonce is per-request, not a constant.
    const second = await request.get("/");
    const secondNonce = cspHeader(second.headers()).match(
      /'nonce-([^']+)'/,
    )?.[1];
    expect(secondNonce).not.toBe(nonce);
  });

  test("sends the hardening headers", async ({ request }) => {
    const headers = (await request.get("/")).headers();

    expect(headers["strict-transport-security"]).toContain("includeSubDomains");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });

  test("accepts violation reports and rejects GET on the report endpoint", async ({
    request,
  }) => {
    const post = await request.post("/api/csp-report", {
      headers: { "Content-Type": "application/csp-report" },
      data: {
        "csp-report": {
          "document-uri": "/",
          "violated-directive": "script-src",
          "blocked-uri": "https://evil.test/skim.js",
        },
      },
    });
    expect(post.status()).toBe(204);

    const get = await request.get("/api/csp-report");
    expect(get.status()).toBe(405);
  });
});
