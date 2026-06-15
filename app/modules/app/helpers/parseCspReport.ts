export type CspViolation = {
  directive: string;
  blockedUri: string;
  documentUri: string;
};

type LegacyReport = {
  "document-uri"?: string;
  "violated-directive"?: string;
  "effective-directive"?: string;
  "blocked-uri"?: string;
};

type ModernReportBody = {
  documentURL?: string;
  effectiveDirective?: string;
  blockedURL?: string;
};

type ModernReport = { type?: string; body?: ModernReportBody };

const UNKNOWN = "unknown";

export default function parseCspReport(payload: unknown): CspViolation[] {
  if (Array.isArray(payload)) {
    return (payload as ModernReport[])
      .filter(
        (entry): entry is { type: string; body: ModernReportBody } =>
          entry?.type === "csp-violation" && !!entry.body,
      )
      .map(({ body }) => ({
        directive: body.effectiveDirective ?? UNKNOWN,
        blockedUri: body.blockedURL ?? UNKNOWN,
        documentUri: body.documentURL ?? UNKNOWN,
      }));
  }

  if (payload && typeof payload === "object" && "csp-report" in payload) {
    const report = (payload as { "csp-report": LegacyReport })["csp-report"];
    return [
      {
        directive:
          report["violated-directive"] ??
          report["effective-directive"] ??
          UNKNOWN,
        blockedUri: report["blocked-uri"] ?? UNKNOWN,
        documentUri: report["document-uri"] ?? UNKNOWN,
      },
    ];
  }

  return [];
}
