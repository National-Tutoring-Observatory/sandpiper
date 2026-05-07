import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";
import formatCost from "../helpers/formatCost";
import type { AdminSpendOverview } from "../services/getAdminSpendOverview.server";

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

export default function SpendOverTimeChart({
  data,
}: {
  data: AdminSpendOverview["overTime"];
}) {
  if (data.length === 0) {
    return (
      <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
        No spend data for this period
      </div>
    );
  }

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
