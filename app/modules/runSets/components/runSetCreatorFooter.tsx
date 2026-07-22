import { Button } from "@/components/ui/button";
import type { EstimationResult } from "~/modules/runSets/runSets.types";
import EstimateInfoBox from "./estimateInfoBox";
import EstimateSummary from "./estimateSummary";
import InsufficientCreditsAlert from "./insufficientCreditsAlert";
import RunSetValidationAlert from "./runSetValidationAlert";

export default function RunSetCreatorFooter({
  name,
  runsCount,
  selectedSessions,
  estimation,
  balance,
  exceedsBalance,
  isLoading,
  onCreateClicked,
}: {
  name: string;
  runsCount: number;
  selectedSessions: string[];
  estimation: EstimationResult;
  balance: number;
  exceedsBalance: boolean;
  isLoading: boolean;
  onCreateClicked: () => void;
}) {
  const hasValidationErrors =
    !name.trim() || runsCount === 0 || selectedSessions.length === 0;
  const isSubmitDisabled = isLoading || hasValidationErrors || exceedsBalance;

  return (
    <div className="bg-background sticky bottom-0 z-10 space-y-3 rounded-b-4xl border-t px-8 py-4">
      {hasValidationErrors ? (
        <RunSetValidationAlert
          name={name}
          runsCount={runsCount}
          selectedSessions={selectedSessions}
        />
      ) : (
        <EstimateInfoBox>
          <div className="flex items-center justify-between gap-4">
            <p className="text-foreground text-body">
              This will create <strong>{runsCount}</strong> run(s) across{" "}
              {selectedSessions.length} session(s)
            </p>
            <EstimateSummary estimation={estimation} balance={balance} />
          </div>
        </EstimateInfoBox>
      )}

      {!hasValidationErrors && (
        <InsufficientCreditsAlert exceedsBalance={exceedsBalance} />
      )}

      <div className="flex justify-end">
        <Button size="lg" onClick={onCreateClicked} disabled={isSubmitDisabled}>
          Create Run Set & Launch Runs
        </Button>
      </div>
    </div>
  );
}
