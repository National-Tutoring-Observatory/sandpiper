import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import formatCost from "../helpers/formatCost";
import type { AdminSpendOverview } from "../services/getAdminSpendOverview.server";
import { StackedCategoryTooltip } from "./categoryTooltip";

const totalCostConfig = {
  totalCost: {
    label: "Cost",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export default function TopUsersChart({
  data,
}: {
  data: AdminSpendOverview["topUsers"];
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
