import { describe, expect, it } from "vitest";
import parseCspReport from "../parseCspReport";

describe("parseCspReport", () => {
  it("parses a legacy report-uri payload ({ 'csp-report': {...} })", () => {
    const violations = parseCspReport({
      "csp-report": {
        "document-uri": "https://app.example.com/page",
        "violated-directive": "script-src",
        "blocked-uri": "https://evil.com/skim.js",
      },
    });

    expect(violations).toEqual([
      {
        directive: "script-src",
        blockedUri: "https://evil.com/skim.js",
        documentUri: "https://app.example.com/page",
      },
    ]);
  });

  it("parses a modern report-to payload (array of reports)", () => {
    const violations = parseCspReport([
      {
        type: "csp-violation",
        body: {
          documentURL: "https://app.example.com/x",
          effectiveDirective: "connect-src",
          blockedURL: "https://tracker.example/beacon",
        },
      },
      {
        type: "csp-violation",
        body: {
          documentURL: "https://app.example.com/y",
          effectiveDirective: "img-src",
          blockedURL: "https://cdn.example/a.png",
        },
      },
    ]);

    expect(violations).toHaveLength(2);
    expect(violations[0].directive).toBe("connect-src");
    expect(violations[1].directive).toBe("img-src");
  });

  it("fills missing fields with 'unknown' rather than undefined", () => {
    const [violation] = parseCspReport({ "csp-report": {} });

    expect(violation.directive).toBe("unknown");
    expect(violation.blockedUri).toBe("unknown");
    expect(violation.documentUri).toBe("unknown");
  });

  it("ignores non-csp-violation reports sent to the same endpoint", () => {
    expect(
      parseCspReport([
        { type: "deprecation", body: { id: "WebSQL" } },
        {
          type: "csp-violation",
          body: {
            effectiveDirective: "img-src",
            blockedURL: "x",
            documentURL: "/",
          },
        },
      ]),
    ).toEqual([{ directive: "img-src", blockedUri: "x", documentUri: "/" }]);
  });

  it("returns an empty array for unrecognized shapes", () => {
    expect(parseCspReport({})).toEqual([]);
    expect(parseCspReport(null)).toEqual([]);
    expect(parseCspReport("nonsense")).toEqual([]);
  });
});
