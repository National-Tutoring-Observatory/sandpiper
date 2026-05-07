import { json2csv } from "json-2-csv";
import { redirect } from "react-router";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import { userIsSuperAdmin } from "~/modules/authorization/helpers/superAdmin";
import type { SpendPeriod } from "../components/spendOverview";
import getAdminSpendOverview from "../services/getAdminSpendOverview.server";

import type { Route } from "./+types/exportSpendOverview.route";

const VALID_PERIODS = new Set<SpendPeriod>(["7d", "30d", "3m"]);

function getSinceDate(period: SpendPeriod): Date {
  const now = new Date();
  switch (period) {
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "3m":
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  }
}

const sanitize = (v: string) => (/^[=+\-@]/.test(v) ? `\t${v}` : v);

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireAuth({ request });

  if (!userIsSuperAdmin(user)) {
    return redirect("/");
  }

  const url = new URL(request.url);
  const rawPeriod = url.searchParams.get("period");
  const period: SpendPeriod = VALID_PERIODS.has(rawPeriod as SpendPeriod)
    ? (rawPeriod as SpendPeriod)
    : "30d";

  const since = getSinceDate(period);
  const data = await getAdminSpendOverview(since);

  const rows = [
    ...data.topTeams.map((t) => ({
      Type: "Team",
      Name: sanitize(t.teamName),
      Email: "",
      "Total Spend": `$${t.totalCost.toFixed(2)}`,
    })),
    ...data.topUsers.map((u) => ({
      Type: "User",
      Name: sanitize(u.userName),
      Email: sanitize(u.userEmail),
      "Total Spend": `$${u.totalCost.toFixed(2)}`,
    })),
  ];

  const csv = json2csv(rows);
  const date = new Date().toISOString().split("T")[0];

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="spend-overview-${period}-${date}.csv"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
