import { useMemo, useState } from "react";
import useEstimateCost from "~/modules/billing/hooks/useEstimateCost";
import RunSetCreateRunsFooter from "../components/runSetCreateRunsFooter";
import RunSetCreateRunsInfo from "../components/runSetCreateRunsInfo";
import RunSetCreatorFormAlerts from "../components/runSetCreatorFormAlerts";
import RunSetCreatorModels from "../components/runSetCreatorModels";
import RunSetCreatorPrompts from "../components/runSetCreatorPrompts";
import RunSetCreatorVerificationToggle from "../components/runSetCreatorVerificationToggle";
import RunSetRunPreview from "../components/runSetRunPreview";
import buildDefinitionsFromSelection from "../helpers/buildDefinitionsFromSelection";
import {
  buildUsedPromptModelSet,
  type PromptModelPair,
} from "../helpers/getUsedPromptModels";
import type { PromptReference, RunSet } from "../runSets.types";

interface RunSetCreateRunsContainerProps {
  teamId: string;
  projectId: string;
  runSet: RunSet;
  usedPromptModels: PromptModelPair[];
  onSubmit: (requestBody: string) => void;
  onCancel: () => void;
  isLoading: boolean;
  errors: Record<string, string>;
}

export default function RunSetCreateRunsContainer({
  teamId,
  projectId,
  runSet,
  usedPromptModels,
  onSubmit,
  onCancel,
  isLoading,
  errors,
}: RunSetCreateRunsContainerProps) {
  const [selectedPrompts, setSelectedPrompts] = useState<PromptReference[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [shouldRunVerification, setShouldRunVerification] = useState(false);
  const [removedKeys, setRemovedKeys] = useState<Set<string>>(new Set());

  const usedKeys = buildUsedPromptModelSet(usedPromptModels);

  const allDefinitions = useMemo(
    () => buildDefinitionsFromSelection(selectedPrompts, selectedModels),
    [selectedPrompts, selectedModels],
  );

  const newDefinitions = allDefinitions.filter((d) => !usedKeys.has(d.key));
  const runDefinitions = newDefinitions.filter((d) => !removedKeys.has(d.key));
  const excludedDefinitions = newDefinitions.filter((d) =>
    removedKeys.has(d.key),
  );
  const duplicateDefinitions = allDefinitions.filter((d) =>
    usedKeys.has(d.key),
  );

  const { estimation, balance, isEstimating } = useEstimateCost({
    projectId,
    definitions: runDefinitions,
    sessionIds: runSet.sessions ?? [],
    shouldRunVerification,
  });

  const exceedsBalance = estimation.estimatedCost > balance;

  const handleRemoveCard = (key: string) => {
    setRemovedKeys((prev) => new Set(prev).add(key));
  };

  const handleRestoreCard = (key: string) => {
    setRemovedKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const handlePromptsChanged = (prompts: PromptReference[]) => {
    setSelectedPrompts(prompts);
    setRemovedKeys(new Set());
  };

  const handleModelsChanged = (models: string[]) => {
    setSelectedModels(models);
    setRemovedKeys(new Set());
  };

  const isSubmitDisabled =
    isLoading ||
    selectedPrompts.length === 0 ||
    selectedModels.length === 0 ||
    runDefinitions.length === 0 ||
    exceedsBalance ||
    isEstimating;

  const handleCreateRuns = () => {
    const requestBody = JSON.stringify({
      intent: "CREATE_RUNS",
      payload: {
        definitions: runDefinitions,
        shouldRunVerification,
      },
    });
    onSubmit(requestBody);
  };

  return (
    <div>
      <div className="flex gap-8 p-8">
        <div className="w-[480px] shrink-0 space-y-8">
          <RunSetCreateRunsInfo runSet={runSet} />

          <RunSetCreatorFormAlerts errors={errors} />

          <RunSetCreatorPrompts
            teamId={teamId}
            annotationType={runSet.annotationType}
            selectedPrompts={selectedPrompts}
            onPromptsChanged={handlePromptsChanged}
          />

          <RunSetCreatorModels
            selectedModels={selectedModels}
            onModelsChanged={handleModelsChanged}
          />

          <RunSetCreatorVerificationToggle
            shouldRunVerification={shouldRunVerification}
            onShouldRunVerificationChanged={setShouldRunVerification}
          />
        </div>

        <RunSetRunPreview
          name={runSet.name}
          runDefinitions={runDefinitions}
          excludedDefinitions={excludedDefinitions}
          duplicateDefinitions={duplicateDefinitions}
          sessionsCount={runSet.sessions?.length || 0}
          onRemoveCard={handleRemoveCard}
          onRestoreCard={handleRestoreCard}
        />
      </div>

      <RunSetCreateRunsFooter
        runSet={runSet}
        selectedPromptsCount={selectedPrompts.length}
        selectedModelsCount={selectedModels.length}
        newRunsCount={runDefinitions.length}
        duplicateCount={duplicateDefinitions.length}
        estimation={estimation}
        balance={balance}
        exceedsBalance={exceedsBalance}
        isLoading={isLoading}
        isSubmitDisabled={isSubmitDisabled}
        onCancel={onCancel}
        onCreateClicked={handleCreateRuns}
      />
    </div>
  );
}
