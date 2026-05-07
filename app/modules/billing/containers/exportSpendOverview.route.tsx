import { json2csv } from "json-2-csv";
import { redirect } from "react-router";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import { userIsSuperAdmin } from "~/modules/authorization/helpers/superAdmin";
import { TeamService } from "~/modules/teams/team";
import { UserService } from "~/modules/users/user";
import { BillingLedgerEntryModel } from "../billingLedgerEntry";
import type { SpendPeriod } from "../components/spendOverview";
import { isUserInitiatedSource } from "../helpers/costCategories";

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

  const entries = await BillingLedgerEntryModel.find({
    direction: "debit",
    createdAt: { $gte: since },
  })
    .sort({ createdAt: -1 })
    .lean();

  const teamIds = [...new Set(entries.map((e) => String(e.team)))];
  const userIds = [
    ...new Set(entries.filter((e) => e.user).map((e) => String(e.user))),
  ];

  const [teams, users] = await Promise.all([
    TeamService.find({ match: { _id: { $in: teamIds } } }),
    userIds.length > 0
      ? UserService.find({ match: { _id: { $in: userIds } } })
      : Promise.resolve([]),
  ]);

  const teamMap = new Map(teams.map((t) => [t._id, t.name]));
  const userMap = new Map(
    users.map((u) => [u._id, { name: u.name || u.username, email: u.email }]),
  );

  const rows = entries.map((entry) => {
    const teamId = String(entry.team);
    const userId = entry.user ? String(entry.user) : null;
    const userInfo = userId ? userMap.get(userId) : null;

    return {
      Date: new Date(entry.createdAt).toISOString(),
      Team: sanitize(teamMap.get(teamId) || teamId),
      User: sanitize(userInfo?.name || "--"),
      "User Email": sanitize(userInfo?.email || "--"),
      Source: String(entry.source),
      Category: isUserInitiatedSource(String(entry.source))
        ? "User-initiated"
        : "System",
      Model: String(entry.model || "--"),
      "Input Tokens": entry.inputTokens ?? 0,
      "Output Tokens": entry.outputTokens ?? 0,
      "Raw Cost": (entry.rawAmount ?? 0).toFixed(4),
      "Billed Amount": (entry.amount ?? 0).toFixed(4),
      "Markup Rate": entry.markupRateApplied ?? "--",
    };
  });

  const csv = json2csv(rows);
  const date = new Date().toISOString().split("T")[0];

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="billing-ledger-${period}-${date}.csv"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
