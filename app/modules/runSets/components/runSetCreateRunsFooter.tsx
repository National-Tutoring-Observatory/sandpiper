import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AlertTriangle, Info } from "lucide-react";
import type { EstimationResult, RunSet } from "../runSets.types";
import EstimateSummary from "./estimateSummary";
import InsufficientCreditsAlert from "./insufficientCreditsAlert";

type FooterState = "ready" | "all_duplicates" | "empty";

interface RunSetCreateRunsFooterProps {
  runSet: RunSet;
  selectedPromptsCount: number;
  selectedModelsCount: number;
  newRunsCount: number;
  duplicateCount: number;
  estimation: EstimationResult;
  balance: number;
  exceedsBalance: boolean;
  isLoading: boolean;
  isSubmitDisabled: boolean;
  onCancel: () => void;
  onCreateClicked: () => void;
}

export default function RunSetCreateRunsFooter({
  runSet,
  selectedPromptsCount,
  selectedModelsCount,
  newRunsCount,
  duplicateCount,
  estimation,
  balance,
  exceedsBalance,
  isLoading,
  isSubmitDisabled,
  onCancel,
  onCreateClicked,
}: RunSetCreateRunsFooterProps) {
  const getFooterState = (): FooterState => {
    if (isLoading) return "ready";
    if (newRunsCount > 0) return "ready";
    if (selectedPromptsCount > 0 && selectedModelsCount > 0) {
      return "all_duplicates";
    }
    return "empty";
  };

  const footerState = getFooterState();

  return (
    <div className="bg-background sticky bottom-0 space-y-3 rounded-b-4xl border-t px-8 py-4">
      {footerState === "ready" && (
        <div className="border-sandpiper-info/20 bg-sandpiper-info/5 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-foreground text-body">
              This will create <strong>{newRunsCount}</strong> new run(s) with{" "}
              {selectedPromptsCount} prompt(s) × {selectedModelsCount} model(s)
              across {runSet.sessions?.length || 0} session(s)
              {duplicateCount > 0 && (
                <span className="text-sandpiper-warning">
                  {" "}
                  ({duplicateCount} duplicate combination(s) will be skipped)
                </span>
              )}
            </p>
            <EstimateSummary estimation={estimation} balance={balance} />
          </div>
        </div>
      )}

      {footerState === "all_duplicates" && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>All combinations already exist</AlertTitle>
          <AlertDescription>
            All selected prompt+model combinations are already in this runSet.
            Please select different prompts or models.
          </AlertDescription>
        </Alert>
      )}

      {footerState === "empty" && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Select prompts and models</AlertTitle>
          <AlertDescription>
            Choose at least one prompt and one model to create new runs.
          </AlertDescription>
        </Alert>
      )}

      {footerState === "ready" && (
        <InsufficientCreditsAlert exceedsBalance={exceedsBalance} />
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onCreateClicked} disabled={isSubmitDisabled}>
          {isLoading && <Spinner className="mr-2" />}
          {isLoading ? "Creating..." : `Create ${newRunsCount} Run(s)`}
        </Button>
      </div>
    </div>
  );
}
