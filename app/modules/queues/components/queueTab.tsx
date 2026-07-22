import { ToggleGroupItem } from "@/components/ui/toggle-group";

interface QueueTabProps {
  value: string;
  label: string;
  count: number;
  ariaLabel: string;
}

export function QueueTab({ value, label, count, ariaLabel }: QueueTabProps) {
  return (
    <ToggleGroupItem
      value={value}
      variant="outline"
      aria-label={ariaLabel}
      className="data-[state=on]:bg-accent/50 hover:bg-accent/50"
    >
      <span className="font-medium">{label}</span>
      <span
        className="bg-muted text-caption rounded-full px-2 py-1"
        aria-hidden="true"
      >
        {count}
      </span>
    </ToggleGroupItem>
  );
}
