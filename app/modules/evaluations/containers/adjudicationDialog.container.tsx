import { useState } from "react";
import useLlmProvider from "~/modules/llm/hooks/useLlmProvider";
import { getDefaultModelCode } from "~/modules/llm/modelRegistry";
import AdjudicationDialog from "../components/adjudicationDialog";
import type { EvaluationReport } from "../evaluations.types";
import getTopPerformersVsGoldLabel from "../helpers/getTopPerformersVsGoldLabel";

export default function AdjudicationDialogContainer({
  report,
  baseRun,
  adjudicationRunIds,
  evaluationPrompt,
  onStartAdjudication,
}: {
  report: EvaluationReport | null;
  baseRun: string;
  adjudicationRunIds: string[];
  evaluationPrompt: { promptId: string; promptVersion: number } | null;
  onStartAdjudication: (
    selectedRuns: string[],
    modelCode: string,
    promptId: string,
    promptVersion: number,
  ) => void;
}) {
  const performers = report
    ? getTopPerformersVsGoldLabel(report, baseRun).filter(
        (p) => !adjudicationRunIds.includes(p.runId),
      )
    : [];
  const nonHumanPerformers = performers.filter((p) => !p.isHuman);

  const initialSelection = nonHumanPerformers.slice(0, 3).map((p) => p.runId);
  const [selectedRuns, setSelectedRuns] = useState<string[]>(initialSelection);
  const llmProvider = useLlmProvider();
  const [selectedModel, setSelectedModel] = useState(
    getDefaultModelCode(llmProvider),
  );

  return (
    <AdjudicationDialog
      performers={nonHumanPerformers}
      selectedRuns={selectedRuns}
      selectedModel={selectedModel}
      onSelectedRunsChanged={setSelectedRuns}
      onSelectedModelChanged={setSelectedModel}
      onStartAdjudication={() =>
        evaluationPrompt &&
        onStartAdjudication(
          selectedRuns,
          selectedModel,
          evaluationPrompt.promptId,
          evaluationPrompt.promptVersion,
        )
      }
    />
  );
}
