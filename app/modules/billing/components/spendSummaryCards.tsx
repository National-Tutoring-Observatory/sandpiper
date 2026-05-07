import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import formatCost from "../helpers/formatCost";
import type { SpendByCategory } from "../services/getAdminSpendOverview.server";

export default function SpendSummaryCards({
  totals,
}: {
  totals: SpendByCategory;
}) {
  const pctUser =
    totals.totalCost > 0
      ? ((totals.userInitiated / totals.totalCost) * 100).toFixed(0)
      : "0";
  const pctSystem =
    totals.totalCost > 0
      ? ((totals.system / totals.totalCost) * 100).toFixed(0)
      : "0";

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Total Spend</CardDescription>
          <CardTitle className="text-2xl">
            {formatCost(totals.totalCost)}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>User-initiated</CardDescription>
          <CardTitle className="text-2xl">
            {formatCost(totals.userInitiated)}
          </CardTitle>
          <CardDescription>{pctUser}% of total</CardDescription>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>System</CardDescription>
          <CardTitle className="text-2xl">
            {formatCost(totals.system)}
          </CardTitle>
          <CardDescription>{pctSystem}% of total</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
