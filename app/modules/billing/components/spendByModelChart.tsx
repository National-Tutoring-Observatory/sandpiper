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

const formatTokens = (value: number) => value.toLocaleString();

interface SpendByModelChartProps {
  data: Array<{
    modelName: string;
    totalCost: number;
    totalInputTokens: number;
    totalOutputTokens: number;
  }>;
}

export default function SpendByModelChart({ data }: SpendByModelChartProps) {
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
          dataKey="modelName"
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
              formatter={(_value, _name, item) => (
                <div className="grid gap-1">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Cost</span>
                    <span className="font-mono font-medium">
                      {formatCost(item.payload.totalCost)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Input tokens</span>
                    <span className="font-mono font-medium">
                      {formatTokens(item.payload.totalInputTokens)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Output tokens</span>
                    <span className="font-mono font-medium">
                      {formatTokens(item.payload.totalOutputTokens)}
                    </span>
                  </div>
                </div>
              )}
            />
          }
        />
        <Bar dataKey="totalCost" fill="var(--color-totalCost)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
