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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type {
  CostByModel,
  CostOverTime,
  SpendGranularity,
} from "~/modules/billing/billingAnalytics.types";
import formatCost from "~/modules/billing/helpers/formatCost";

interface SpendAnalyticsProps {
  byModel: Array<CostByModel & { modelName: string }>;
  bySource: Array<{ label: string; totalCost: number }>;
  overTime: CostOverTime[];
  granularity: SpendGranularity;
  onGranularityChanged: (value: SpendGranularity) => void;
}

const costChartConfig = {
  totalCost: {
    label: "Cost",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const formatTokens = (value: number) => value.toLocaleString();

function EmptyState() {
  return (
    <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
      No spend data yet
    </div>
  );
}

function SpendByModelChart({
  data,
}: {
  data: Array<CostByModel & { modelName: string }>;
}) {
  if (data.length === 0) return <EmptyState />;

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

function SpendBySourceChart({
  data,
}: {
  data: Array<{ label: string; totalCost: number }>;
}) {
  if (data.length === 0) return <EmptyState />;

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

function SpendOverTimeChart({
  data,
  granularity,
  onGranularityChanged,
}: {
  data: CostOverTime[];
  granularity: SpendGranularity;
  onGranularityChanged: (value: SpendGranularity) => void;
}) {
  if (data.length === 0) return <EmptyState />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Select value={granularity} onValueChange={onGranularityChanged}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Daily</SelectItem>
            <SelectItem value="week">Weekly</SelectItem>
            <SelectItem value="month">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <ChartContainer config={costChartConfig} className="h-72 w-full">
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
                formatter={(value) => formatCost(value as number)}
              />
            }
          />
          <Bar dataKey="totalCost" fill="var(--color-totalCost)" radius={4} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

export default function SpendAnalytics({
  byModel,
  bySource,
  overTime,
  granularity,
  onGranularityChanged,
}: SpendAnalyticsProps) {
  const hasData =
    byModel.length > 0 || bySource.length > 0 || overTime.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Spend analytics</CardTitle>
        {!hasData && (
          <CardDescription>
            Spend data will appear here once LLM calls are made.
          </CardDescription>
        )}
      </CardHeader>
      {hasData && (
        <CardContent>
          <Tabs defaultValue="model">
            <TabsList>
              <TabsTrigger value="model">By Model</TabsTrigger>
              <TabsTrigger value="source">By Activity</TabsTrigger>
              <TabsTrigger value="time">Over Time</TabsTrigger>
            </TabsList>
            <TabsContent value="model" className="pt-4">
              <SpendByModelChart data={byModel} />
            </TabsContent>
            <TabsContent value="source" className="pt-4">
              <SpendBySourceChart data={bySource} />
            </TabsContent>
            <TabsContent value="time" className="pt-4">
              <SpendOverTimeChart
                data={overTime}
                granularity={granularity}
                onGranularityChanged={onGranularityChanged}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
}
