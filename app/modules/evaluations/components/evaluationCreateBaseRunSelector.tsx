import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import { Label } from "@/components/ui/label";
import { ChevronRight } from "lucide-react";
import getRunDisabledReason from "~/modules/evaluations/helpers/getRunDisabledReason";
import type { Run } from "~/modules/runs/runs.types";

export default function EvaluationCreateBaseRunSelector({
  runs,
  baseRun,
  onBaseRunChanged,
}: {
  runs: Run[];
  baseRun: string | null;
  onBaseRunChanged: (id: string | null) => void;
}) {
  return (
    <div className="border-r p-4">
      <Label className="text-muted-foreground text-caption py-2 tracking-wide uppercase">
        Base run
      </Label>
      <ItemGroup className="mt-3 gap-2">
        {runs.map((run) => {
          const disabledReason = getRunDisabledReason(run);
          return (
            <Item
              key={run._id}
              variant={baseRun === run._id ? "outline" : "default"}
              size="sm"
              className={
                disabledReason
                  ? "cursor-not-allowed opacity-50"
                  : baseRun === run._id
                    ? "cursor-pointer"
                    : "hover:bg-accent cursor-pointer"
              }
              onClick={
                disabledReason ? undefined : () => onBaseRunChanged(run._id)
              }
            >
              <ItemContent>
                <ItemTitle>{run.name}</ItemTitle>
                {disabledReason && (
                  <ItemDescription>{disabledReason}</ItemDescription>
                )}
              </ItemContent>
              <ItemActions>
                <ChevronRight className="text-muted-foreground size-4" />
              </ItemActions>
            </Item>
          );
        })}
      </ItemGroup>
    </div>
  );
}
