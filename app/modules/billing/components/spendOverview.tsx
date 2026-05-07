import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download } from "lucide-react";
import triggerDownload from "~/modules/app/helpers/triggerDownload";
import type { AdminSpendOverview } from "../services/getAdminSpendOverview.server";
import SpendByModelChart from "./spendByModelChart";
import SpendBySourceChart from "./spendBySourceChart";
import SpendOverTimeChart from "./spendOverTimeChart";
import SpendSummaryCards from "./spendSummaryCards";
import TopTeamsChart from "./topTeamsChart";
import TopUsersChart from "./topUsersChart";

export type SpendPeriod = "7d" | "30d" | "3m";

interface SpendOverviewProps {
  data: AdminSpendOverview;
  period: SpendPeriod;
  onPeriodChanged: (period: SpendPeriod) => void;
}

const PERIOD_LABELS: Record<SpendPeriod, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "3m": "Last 3 months",
};

export default function SpendOverview({
  data,
  period,
  onPeriodChanged,
}: SpendOverviewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Select
          value={period}
          onValueChange={(v) => onPeriodChanged(v as SpendPeriod)}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PERIOD_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm"
          onClick={() => {
            triggerDownload(`/api/exportSpendOverview?period=${period}`);
          }}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      <SpendSummaryCards totals={data.categoryTotals} />
      <SpendOverTimeChart data={data.overTime} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spend by model</CardTitle>
          </CardHeader>
          <CardContent>
            <SpendByModelChart data={data.byModel} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spend by activity</CardTitle>
          </CardHeader>
          <CardContent>
            <SpendBySourceChart data={data.bySource} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TopTeamsChart data={data.topTeams} />
        <TopUsersChart data={data.topUsers} />
      </div>
    </div>
  );
}
