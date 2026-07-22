import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Item, ItemContent, ItemGroup, ItemTitle } from "@/components/ui/item";
import ModelSelectorContainer from "~/modules/prompts/containers/modelSelectorContainer";
import type { TopPerformer } from "../helpers/getTopPerformersVsGoldLabel";

export default function AdjudicationDialog({
  performers,
  selectedRuns,
  selectedModel,
  onSelectedRunsChanged,
  onSelectedModelChanged,
  onStartAdjudication,
}: {
  performers: TopPerformer[];
  selectedRuns: string[];
  selectedModel: string;
  onSelectedRunsChanged: (ids: string[]) => void;
  onSelectedModelChanged: (model: string) => void;
  onStartAdjudication: () => void;
}) {
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Improve via adjudication</DialogTitle>
        <DialogDescription>
          Select the top performing runs you would like to include in the
          adjudication. A minimum of 2 runs must be selected.
        </DialogDescription>
      </DialogHeader>

      <div>
        <label className="text-body font-medium">Adjudicator</label>
        <ModelSelectorContainer
          selectedModel={selectedModel}
          onSelectedModelChanged={onSelectedModelChanged}
        />
      </div>

      <ItemGroup className="max-h-80 gap-2 overflow-y-auto">
        {performers.map((performer) => (
          <Item
            key={performer.runId}
            variant="muted"
            size="sm"
            className="hover:bg-accent cursor-pointer"
            onClick={() => {
              if (selectedRuns.includes(performer.runId)) {
                onSelectedRunsChanged(
                  selectedRuns.filter((id) => id !== performer.runId),
                );
              } else {
                onSelectedRunsChanged([...selectedRuns, performer.runId]);
              }
            }}
          >
            <Checkbox
              id={`adjudication-${performer.runId}`}
              checked={selectedRuns.includes(performer.runId)}
              onCheckedChange={(checked) => {
                if (checked) {
                  onSelectedRunsChanged([...selectedRuns, performer.runId]);
                } else {
                  onSelectedRunsChanged(
                    selectedRuns.filter((id) => id !== performer.runId),
                  );
                }
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <ItemContent>
              <ItemTitle>{performer.runName}</ItemTitle>
              <div className="text-muted-foreground text-caption flex gap-3">
                <span>Kappa: {performer.kappa.toFixed(2)}</span>
                {performer.precision != null && (
                  <span>Precision: {performer.precision.toFixed(2)}</span>
                )}
                {performer.recall != null && (
                  <span>Recall: {performer.recall.toFixed(2)}</span>
                )}
                {performer.f1 != null && (
                  <span>F1: {performer.f1.toFixed(2)}</span>
                )}
              </div>
            </ItemContent>
          </Item>
        ))}
      </ItemGroup>

      <DialogFooter className="justify-end">
        <DialogClose asChild>
          <Button type="button" variant="secondary">
            Cancel
          </Button>
        </DialogClose>
        <DialogClose asChild>
          <Button
            type="button"
            disabled={selectedRuns.length < 2 || !selectedModel}
            onClick={onStartAdjudication}
          >
            Start adjudication
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
}
