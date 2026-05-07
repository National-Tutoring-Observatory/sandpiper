import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";
import triggerDownload from "~/modules/app/helpers/triggerDownload";
import formatCost from "../helpers/formatCost";
import type { AdminSpendOverview } from "../services/getAdminSpendOverview.server";

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

const overTimeConfig = {
  userInitiated: {
    label: "User-initiated",
    color: "var(--chart-1)",
  },
  system: {
    label: "System",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

function EmptyState() {
  return (
    <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
      No spend data for this period
    </div>
  );
}

function SummaryCards({
  totals,
}: {
  totals: AdminSpendOverview["categoryTotals"];
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

function SpendOverTimeChart({
  data,
}: {
  data: AdminSpendOverview["overTime"];
}) {
  if (data.length === 0) return <EmptyState />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Spend over time</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={overTimeConfig} className="h-72 w-full">
          <BarChart data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="period"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis tickFormatter={formatCost} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) =>
                    `${name}: ${formatCost(value as number)}`
                  }
                />
              }
            />
            <Legend />
            <Bar
              dataKey="userInitiated"
              name="User-initiated"
              fill="var(--color-userInitiated)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="system"
              name="System"
              fill="var(--color-system)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function CategoryTooltip({
  totalCost,
  userInitiated,
  system,
  extra,
}: {
  totalCost: number;
  userInitiated: number;
  system: number;
  extra?: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="grid gap-1">
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">Total</span>
        <span className="font-mono font-medium">{formatCost(totalCost)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">User-initiated</span>
        <span className="font-mono font-medium">
          {formatCost(userInitiated)}
        </span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">System</span>
        <span className="font-mono font-medium">{formatCost(system)}</span>
      </div>
      {extra?.map((e) => (
        <div key={e.label} className="flex justify-between gap-4">
          <span className="text-muted-foreground">{e.label}</span>
          <span className="font-mono font-medium">{e.value}</span>
        </div>
      ))}
    </div>
  );
}

function StackedCategoryTooltip({
  active,
  payload,
  extra,
}: {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[];
  extra?: (
    row: Record<string, unknown>,
  ) => Array<{ label: string; value: string }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="bg-background border-border rounded-lg border px-3 py-2 shadow-md">
      <CategoryTooltip
        totalCost={row.totalCost}
        userInitiated={row.userInitiated}
        system={row.system}
        extra={extra?.(row)}
      />
    </div>
  );
}

const totalCostConfig = {
  totalCost: {
    label: "Cost",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

function TopTeamsChart({ data }: { data: AdminSpendOverview["topTeams"] }) {
  if (data.length === 0) return <EmptyState />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top teams by spend</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={totalCostConfig} className="h-72 w-full">
          <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="teamName"
              type="category"
              tickLine={false}
              axisLine={false}
              width={140}
              tick={{ fontSize: 12 }}
            />
            <XAxis type="number" tickFormatter={formatCost} />
            <ChartTooltip content={<StackedCategoryTooltip />} />
            <Bar dataKey="totalCost" fill="var(--color-totalCost)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function TopUsersChart({ data }: { data: AdminSpendOverview["topUsers"] }) {
  if (data.length === 0) return <EmptyState />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top users by spend</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={totalCostConfig} className="h-72 w-full">
          <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="userName"
              type="category"
              tickLine={false}
              axisLine={false}
              width={140}
              tick={{ fontSize: 12 }}
            />
            <XAxis type="number" tickFormatter={formatCost} />
            <ChartTooltip
              content={
                <StackedCategoryTooltip
                  extra={(row) => [
                    { label: "Email", value: String(row.userEmail ?? "--") },
                  ]}
                />
              }
            />
            <Bar dataKey="totalCost" fill="var(--color-totalCost)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

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

      <SummaryCards totals={data.categoryTotals} />
      <SpendOverTimeChart data={data.overTime} />

      <div className="grid gap-6 lg:grid-cols-2">
        <TopTeamsChart data={data.topTeams} />
        <TopUsersChart data={data.topUsers} />
      </div>
    </div>
  );
}
