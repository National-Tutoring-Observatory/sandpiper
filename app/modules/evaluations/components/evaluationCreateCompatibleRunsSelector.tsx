import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import { Label } from "@/components/ui/label";
import getRunDisabledReason from "~/modules/evaluations/helpers/getRunDisabledReason";
import type { Run } from "~/modules/runs/runs.types";

export default function EvaluationCreateCompatibleRunsSelector({
  baseRun,
  compatibleRuns,
  selectedRuns,
  onSelectedRunsChanged,
}: {
  baseRun: string | null;
  compatibleRuns: Run[];
  selectedRuns: string[];
  onSelectedRunsChanged: (ids: string[]) => void;
}) {
  const selectableRuns = compatibleRuns.filter(
    (run) => !getRunDisabledReason(run),
  );

  const allSelected =
    selectableRuns.length > 0 &&
    selectableRuns.every((run) => selectedRuns.includes(run._id));

  const toggleSelectAll = () => {
    const selectableIds = selectableRuns.map((run) => run._id);
    if (allSelected) {
      onSelectedRunsChanged(
        selectedRuns.filter((id) => !selectableIds.includes(id)),
      );
    } else {
      onSelectedRunsChanged([...new Set([...selectedRuns, ...selectableIds])]);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <Label className="text-muted-foreground text-caption tracking-wide uppercase">
          Compatible runs
        </Label>
        {baseRun && selectableRuns.length > 0 && (
          <Button
            variant="link"
            size="sm"
            className="text-caption p-0"
            onClick={toggleSelectAll}
          >
            {allSelected ? "Deselect all" : "Select all"}
          </Button>
        )}
      </div>
      {baseRun && compatibleRuns.length > 0 && (
        <ItemGroup className="mt-3 gap-2">
          {compatibleRuns.map((run) => {
            const disabledReason = getRunDisabledReason(run);
            return (
              <Item
                key={run._id}
                variant="muted"
                size="sm"
                className={
                  disabledReason
                    ? "cursor-not-allowed opacity-50"
                    : "hover:bg-accent cursor-pointer"
                }
                onClick={
                  disabledReason
                    ? undefined
                    : () => {
                        if (selectedRuns.includes(run._id)) {
                          onSelectedRunsChanged(
                            selectedRuns.filter((id) => id !== run._id),
                          );
                        } else {
                          onSelectedRunsChanged([...selectedRuns, run._id]);
                        }
                      }
                }
              >
                <Checkbox
                  id={`right-${run._id}`}
                  checked={selectedRuns.includes(run._id)}
                  disabled={!!disabledReason}
                  onCheckedChange={(checked) => {
                    if (disabledReason) return;
                    if (checked) {
                      onSelectedRunsChanged([...selectedRuns, run._id]);
                    } else {
                      onSelectedRunsChanged(
                        selectedRuns.filter((id) => id !== run._id),
                      );
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <ItemContent>
                  <ItemTitle>{run.name}</ItemTitle>
                  {disabledReason && (
                    <ItemDescription>{disabledReason}</ItemDescription>
                  )}
                </ItemContent>
              </Item>
            );
          })}
        </ItemGroup>
      )}
      {baseRun && compatibleRuns.length === 0 && (
        <Empty className="mt-3">
          <EmptyHeader>
            <EmptyTitle>No compatible runs</EmptyTitle>
            <EmptyDescription>
              No other runs share the same sessions as the selected base run.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      {!baseRun && (
        <Empty className="mt-3">
          <EmptyHeader>
            <EmptyTitle>No base run selected</EmptyTitle>
            <EmptyDescription>
              Select a base run to see other compatible runs to base your
              evaluations on.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}
