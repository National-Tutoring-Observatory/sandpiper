import { useMemo, useState } from "react";
import useEstimateCost from "~/modules/billing/hooks/useEstimateCost";
import type { SessionData } from "~/modules/sessions/sessions.types";
import RunSetCreatorAnnotationType from "../components/runSetCreatorAnnotationType";
import RunSetCreatorFooter from "../components/runSetCreatorFooter";
import RunSetCreatorFormAlerts from "../components/runSetCreatorFormAlerts";
import RunSetCreatorModels from "../components/runSetCreatorModels";
import RunSetCreatorName from "../components/runSetCreatorName";
import RunSetCreatorPrompts from "../components/runSetCreatorPrompts";
import RunSetCreatorSessions from "../components/runSetCreatorSessions";
import RunSetCreatorVerificationToggle from "../components/runSetCreatorVerificationToggle";
import RunSetRunPreview from "../components/runSetRunPreview";
import buildDefinitionsFromSelection from "../helpers/buildDefinitionsFromSelection";
import type { PrefillData, PromptReference } from "../runSets.types";

function getDefaultName(prefillData?: PrefillData | null): string {
  if (!prefillData) return "";
  if (prefillData.sourceRunSetName) {
    return `Run set from ${prefillData.sourceRunSetName}`;
  }
  if (prefillData.sourceRunName) {
    return `Run set from ${prefillData.sourceRunName}`;
  }
  return "";
}

export default function RunSetCreatorContainer({
  teamId,
  projectId,
  prefillData,
  onSubmit,
  isLoading,
  errors,
}: {
  teamId: string;
  projectId: string;
  prefillData?: PrefillData | null;
  onSubmit: (requestBody: string) => void;
  isLoading: boolean;
  errors: Record<string, string>;
}) {
  const [name, setName] = useState(getDefaultName(prefillData));
  const [annotationType, setAnnotationType] = useState(
    prefillData?.annotationType || "PER_UTTERANCE",
  );
  const [selectedPrompts, setSelectedPrompts] = useState<PromptReference[]>(
    prefillData?.selectedPrompts || [],
  );
  const [selectedModels, setSelectedModels] = useState<string[]>(
    prefillData?.selectedModels || [],
  );
  const [selectedSessions, setSelectedSessions] = useState<SessionData[]>(
    prefillData?.selectedSessions || [],
  );
  const [shouldRunVerification, setShouldRunVerification] = useState(
    prefillData?.shouldRunVerification ?? true,
  );
  const [removedKeys, setRemovedKeys] = useState<Set<string>>(new Set());

  const allDefinitions = useMemo(
    () => buildDefinitionsFromSelection(selectedPrompts, selectedModels),
    [selectedPrompts, selectedModels],
  );

  const runDefinitions = allDefinitions.filter((d) => !removedKeys.has(d.key));
  const excludedDefinitions = allDefinitions.filter((d) =>
    removedKeys.has(d.key),
  );

  const { estimation, balance, isEstimating } = useEstimateCost({
    projectId,
    definitions: runDefinitions,
    sessionIds: selectedSessions.map((s) => s._id),
    shouldRunVerification,
  });

  const exceedsBalance = estimation.estimatedCost > balance;

  const handleAnnotationTypeChange = (type: string) => {
    setAnnotationType(type);
    setSelectedPrompts([]);
    setRemovedKeys(new Set());
  };

  const handlePromptsChanged = (prompts: PromptReference[]) => {
    setSelectedPrompts(prompts);
    setRemovedKeys(new Set());
  };

  const handleModelsChanged = (models: string[]) => {
    setSelectedModels(models);
    setRemovedKeys(new Set());
  };

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

  const handleSubmit = () => {
    const requestBody = JSON.stringify({
      intent: "CREATE_RUN_SET",
      payload: {
        name,
        annotationType,
        definitions: runDefinitions,
        sessions: selectedSessions.map((s) => s._id),
        shouldRunVerification,
      },
    });
    onSubmit(requestBody);
  };

  return (
    <div className="">
      <div className="flex gap-8 p-8">
        <div className="w-[480px] shrink-0 space-y-8">
          <RunSetCreatorFormAlerts errors={errors} prefillData={prefillData} />

          <RunSetCreatorName name={name} onNameChanged={setName} />

          <RunSetCreatorAnnotationType
            annotationType={annotationType}
            onAnnotationTypeChanged={handleAnnotationTypeChange}
          />

          <RunSetCreatorPrompts
            teamId={teamId}
            annotationType={annotationType}
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

          <RunSetCreatorSessions
            selectedSessions={selectedSessions.map((s) => s._id)}
            onSessionsChanged={setSelectedSessions}
          />
        </div>

        <RunSetRunPreview
          name={name}
          runDefinitions={runDefinitions}
          excludedDefinitions={excludedDefinitions}
          sessionsCount={selectedSessions.length}
          onRemoveCard={handleRemoveCard}
          onRestoreCard={handleRestoreCard}
        />
      </div>

      <RunSetCreatorFooter
        name={name}
        runsCount={runDefinitions.length}
        selectedSessions={selectedSessions.map((s) => s._id)}
        estimation={estimation}
        balance={balance}
        exceedsBalance={exceedsBalance}
        isLoading={isLoading || isEstimating}
        onCreateClicked={handleSubmit}
      />
    </div>
  );
}
