import { describe, expect, it } from "vitest";
import { action, loader } from "../cspReport.route";

function postRequest(body: unknown, contentType = "application/csp-report") {
  return {
    request: new Request("http://localhost/api/csp-report", {
      method: "POST",
      headers: { "Content-Type": contentType },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    params: {},
    context: {},
  } as never;
}

describe("cspReport.route", () => {
  it("returns 204 for a valid violation report", async () => {
    const response = await action(
      postRequest({
        "csp-report": {
          "document-uri": "https://app/x",
          "violated-directive": "script-src",
          "blocked-uri": "https://evil/x.js",
        },
      }),
    );

    expect(response.status).toBe(204);
  });

  it("returns 204 even when the body is not valid JSON (best-effort)", async () => {
    const response = await action(postRequest("} not json {"));
    expect(response.status).toBe(204);
  });

  it("rejects non-POST methods with 405", async () => {
    const response = loader();
    expect(response.status).toBe(405);
  });
});
