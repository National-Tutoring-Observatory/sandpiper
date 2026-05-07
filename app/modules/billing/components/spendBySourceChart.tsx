import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import formatCost from "../helpers/formatCost";

const costChartConfig = {
  totalCost: {
    label: "Cost",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

interface SpendBySourceChartProps {
  data: Array<{ label: string; totalCost: number }>;
}

export default function SpendBySourceChart({ data }: SpendBySourceChartProps) {
  if (data.length === 0) {
    return (
      <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
        No spend data yet
      </div>
    );
  }

  return (
    <ChartContainer config={costChartConfig} className="h-72 w-full">
      <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
        <CartesianGrid horizontal={false} />
        <YAxis
          dataKey="label"
          type="category"
          tickLine={false}
          axisLine={false}
          width={140}
          tick={{ fontSize: 12 }}
        />
        <XAxis type="number" tickFormatter={formatCost} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => formatCost(value as number)}
            />
          }
        />
        <Bar dataKey="totalCost" fill="var(--color-totalCost)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
