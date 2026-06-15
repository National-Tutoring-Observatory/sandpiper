import parseCspReport from "../helpers/parseCspReport";

export async function action({ request }: { request: Request }) {
  try {
    for (const violation of parseCspReport(await request.json())) {
      console.warn(
        `[csp] ${violation.directive} blocked ${violation.blockedUri} on ${violation.documentUri}`,
      );
    }
  } catch {
    // Reports are best-effort telemetry — never fail the browser's beacon.
  }

  return new Response(null, { status: 204 });
}

export function loader() {
  return new Response(null, { status: 405 });
}
