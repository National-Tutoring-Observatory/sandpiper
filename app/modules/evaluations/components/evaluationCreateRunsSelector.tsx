import { Label } from "@/components/ui/label";
import type { Run } from "~/modules/runs/runs.types";
import type { AnnotationSchemaFieldCount } from "../helpers/getAnnotationSchemaFieldCounts";
import EvaluationCreateAnnotationSchemaDisplay from "./evaluationCreateAnnotationSchemaDisplay";
import EvaluationCreateBaseRunSelector from "./evaluationCreateBaseRunSelector";
import EvaluationCreateCompatibleRunsSelector from "./evaluationCreateCompatibleRunsSelector";

export default function EvaluationCreateRunsSelector({
  runs,
  baseRun,
  compatibleRuns,
  selectedRuns,
  annotationSchemaFieldCounts,
  selectedAnnotationFields,
  onBaseRunChanged,
  onSelectedRunsChanged,
  onAnnotationFieldToggled,
}: {
  runs: Run[];
  baseRun: string | null;
  compatibleRuns: Run[];
  selectedRuns: string[];
  annotationSchemaFieldCounts: AnnotationSchemaFieldCount[];
  selectedAnnotationFields: string[];
  onBaseRunChanged: (id: string | null) => void;
  onSelectedRunsChanged: (ids: string[]) => void;
  onAnnotationFieldToggled: (fieldKey: string) => void;
}) {
  return (
    <div className="max-w-7xl">
      <div className="space-y-2">
        <Label>Select your runs for evaluation</Label>
        <p className="text-muted-foreground text-body">
          Start by selecting a base run that will become the run that all other
          runs will be compared to. This is usually a human annotated run but
          can also be AI generated. Once you've selected a base run, choose the
          runs you would like to compare in the compatible runs list.
        </p>

        <div className="rounded-md border">
          <div className="grid grid-cols-2">
            <EvaluationCreateBaseRunSelector
              runs={runs}
              baseRun={baseRun}
              onBaseRunChanged={onBaseRunChanged}
            />
            <EvaluationCreateCompatibleRunsSelector
              baseRun={baseRun}
              compatibleRuns={compatibleRuns}
              selectedRuns={selectedRuns}
              onSelectedRunsChanged={onSelectedRunsChanged}
            />
          </div>
        </div>

        <EvaluationCreateAnnotationSchemaDisplay
          fieldCounts={annotationSchemaFieldCounts}
          selectedAnnotationFields={selectedAnnotationFields}
          onAnnotationFieldToggled={onAnnotationFieldToggled}
        />
      </div>
    </div>
  );
}
