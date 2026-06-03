import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";
import { Link } from "react-router";
import { projectRunSetUrl } from "~/modules/projects/helpers/projectUrls";
import type { Run } from "~/modules/runs/runs.types";
import type { AnnotationSchemaFieldCount } from "../helpers/getAnnotationSchemaFieldCounts";
import EvaluationCreateFooter from "./evaluationCreateFooter";
import EvaluationCreateRunsSelector from "./evaluationCreateRunsSelector";

export default function EvaluationCreate({
  name,
  isSubmitting,
  isSubmitDisabled,
  isAbleToCreateEvaluation,
  teamId,
  projectId,
  runSetId,
  runs,
  baseRun,
  compatibleRuns,
  selectedRuns,
  annotationSchemaFieldCounts,
  selectedAnnotationFields,
  onNameChanged,
  onBaseRunChanged,
  onSelectedRunsChanged,
  onAnnotationFieldToggled,
  onSubmit,
  onCancel,
}: {
  name: string;
  isSubmitting: boolean;
  isSubmitDisabled: boolean;
  isAbleToCreateEvaluation: boolean;
  teamId: string;
  projectId: string;
  runSetId: string;
  runs: Run[];
  baseRun: string | null;
  compatibleRuns: Run[];
  selectedRuns: string[];
  annotationSchemaFieldCounts: AnnotationSchemaFieldCount[];
  selectedAnnotationFields: string[];
  onNameChanged: (value: string) => void;
  onBaseRunChanged: (id: string | null) => void;
  onSelectedRunsChanged: (ids: string[]) => void;
  onAnnotationFieldToggled: (fieldKey: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  if (!isAbleToCreateEvaluation) {
    return (
      <div className="max-w-2xl">
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Unable to create evaluation</AlertTitle>
          <AlertDescription>
            At least 2 runs are required to create an evaluation.{" "}
            <Link
              to={projectRunSetUrl(teamId, projectId, runSetId)}
              className="underline"
            >
              Back to run set
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-160px)] flex-col">
      <div className="flex-1 space-y-6 pb-4">
        <div className="max-w-2xl">
          <div className="space-y-2">
            <Label htmlFor="name">Evaluation Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => onNameChanged(e.target.value)}
              placeholder="Enter evaluation name"
              autoFocus
            />
          </div>
        </div>

        <EvaluationCreateRunsSelector
          runs={runs}
          baseRun={baseRun}
          compatibleRuns={compatibleRuns}
          selectedRuns={selectedRuns}
          annotationSchemaFieldCounts={annotationSchemaFieldCounts}
          selectedAnnotationFields={selectedAnnotationFields}
          onBaseRunChanged={onBaseRunChanged}
          onSelectedRunsChanged={onSelectedRunsChanged}
          onAnnotationFieldToggled={onAnnotationFieldToggled}
        />
      </div>

      <EvaluationCreateFooter
        name={name}
        baseRun={baseRun}
        selectedRuns={selectedRuns}
        selectedAnnotationFields={selectedAnnotationFields}
        isSubmitting={isSubmitting}
        isSubmitDisabled={isSubmitDisabled}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    </div>
  );
}
