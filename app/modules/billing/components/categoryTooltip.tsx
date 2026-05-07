import formatCost from "../helpers/formatCost";

export function CategoryTooltip({
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

export function StackedCategoryTooltip({
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
