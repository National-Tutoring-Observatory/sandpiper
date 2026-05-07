import { redirect, useSearchParams } from "react-router";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import { userIsSuperAdmin } from "~/modules/authorization/helpers/superAdmin";
import SpendOverview, { type SpendPeriod } from "../components/spendOverview";
import getAdminSpendOverview from "../services/getAdminSpendOverview.server";

import type { Route } from "./+types/spendOverview.route";

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

  return { data, period };
}

export default function SpendOverviewRoute({
  loaderData,
}: Route.ComponentProps) {
  const { data, period } = loaderData;
  const [, setSearchParams] = useSearchParams();

  const onPeriodChanged = (newPeriod: SpendPeriod) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev.toString());
        next.set("period", newPeriod);
        return next;
      },
      { replace: true },
    );
  };

  return (
    <SpendOverview
      data={data}
      period={period}
      onPeriodChanged={onPeriodChanged}
    />
  );
}
