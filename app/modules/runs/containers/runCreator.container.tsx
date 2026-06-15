import { useState } from "react";
import {
  isAnnotationType,
  type AnnotationTypeOptions,
} from "~/modules/annotations/helpers/annotationTypes";
import useEstimateCost from "~/modules/billing/hooks/useEstimateCost";
import { getDefaultModelCode } from "~/modules/llm/modelRegistry";
import type { CreateRun, Run } from "~/modules/runs/runs.types";
import type { SessionData } from "~/modules/sessions/sessions.types";
import RunCreator from "../components/runCreator";

interface RunCreatorContainerProps {
  teamId: string;
  projectId: string;
  onStartRunClicked: (createRun: CreateRun) => void;
  isSubmitting: boolean;
  initialRun?: Run | null;
  duplicateWarnings?: string[];
}

export default function ProjectRunCreatorContainer({
  teamId,
  projectId,
  onStartRunClicked,
  isSubmitting,
  initialRun,
  duplicateWarnings = [],
}: RunCreatorContainerProps) {
  const [runName, setRunName] = useState(
    initialRun ? `${initialRun.name} (copy)` : "",
  );
  const [selectedAnnotationType, setSelectedAnnotationType] =
    useState<AnnotationTypeOptions>(
      isAnnotationType(initialRun?.annotationType ?? "")
        ? (initialRun?.annotationType as AnnotationTypeOptions)
        : "PER_UTTERANCE",
    );
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(
    (initialRun?.prompt as string) || null,
  );
  const [selectedPromptVersion, setSelectedPromptVersion] = useState<
    number | null
  >(initialRun?.promptVersion || null);
  const [selectedModel, setSelectedModel] = useState(
    initialRun?.snapshot?.model?.code || getDefaultModelCode(),
  );
  const [selectedSessions, setSelectedSessions] = useState<SessionData[]>(
    initialRun?.sessions?.map((s) => ({ _id: s.sessionId })) || [],
  );
  const [shouldRunVerification, setShouldRunVerification] = useState(
    initialRun?.shouldRunVerification ?? true,
  );
  const onSelectedAnnotationTypeChanged = (selectedAnnotationType: string) => {
    if (!isAnnotationType(selectedAnnotationType)) return;
    setSelectedPrompt(null);
    setSelectedPromptVersion(null);
    setSelectedAnnotationType(selectedAnnotationType);
  };

  const onSelectedPromptChanged = (selectedPrompt: string) => {
    setSelectedPrompt(selectedPrompt);
  };

  const onSelectedPromptVersionChanged = (selectedPromptVersion: number) => {
    setSelectedPromptVersion(selectedPromptVersion);
  };

  const onSelectedModelChanged = (selectedModel: string) => {
    setSelectedModel(selectedModel);
  };

  const selectedSessionIds = selectedSessions.map((s) => s._id);

  const onSelectedSessionsChanged = (sessions: SessionData[]) => {
    setSelectedSessions(sessions);
  };

  const { estimation, balance, isEstimating } = useEstimateCost({
    projectId,
    definitions:
      selectedPrompt && selectedPromptVersion
        ? [
            {
              key: `${selectedPrompt}:${selectedPromptVersion}:${selectedModel}`,
              modelCode: selectedModel,
              prompt: {
                promptId: selectedPrompt,
                promptName: "",
                version: selectedPromptVersion,
              },
            },
          ]
        : [],
    sessionIds: selectedSessions.map((s) => s._id),
    shouldRunVerification,
  });

  const exceedsBalance = estimation.estimatedCost > balance;

  const onStartRunButtonClicked = () => {
    onStartRunClicked({
      name: runName,
      selectedAnnotationType,
      selectedPrompt,
      selectedPromptVersion,
      selectedModel,
      selectedSessions: selectedSessionIds,
      shouldRunVerification,
    });
  };

  const isRunButtonDisabled =
    !(
      runName.trim().length >= 3 &&
      selectedPrompt &&
      selectedPromptVersion &&
      selectedSessionIds.length > 0
    ) ||
    exceedsBalance ||
    isEstimating;

  return (
    <RunCreator
      teamId={teamId}
      duplicateWarnings={duplicateWarnings}
      runName={runName}
      selectedAnnotationType={selectedAnnotationType}
      selectedPrompt={selectedPrompt}
      selectedPromptVersion={selectedPromptVersion}
      selectedModel={selectedModel}
      selectedSessions={selectedSessionIds}
      estimation={estimation}
      balance={balance}
      exceedsBalance={exceedsBalance}
      isSubmitting={isSubmitting}
      isRunButtonDisabled={isRunButtonDisabled || isSubmitting}
      onRunNameChanged={setRunName}
      onSelectedAnnotationTypeChanged={onSelectedAnnotationTypeChanged}
      onSelectedPromptChanged={onSelectedPromptChanged}
      onSelectedPromptVersionChanged={onSelectedPromptVersionChanged}
      onSelectedModelChanged={onSelectedModelChanged}
      onSelectedSessionsChanged={onSelectedSessionsChanged}
      shouldRunVerification={shouldRunVerification}
      onShouldRunVerificationChanged={setShouldRunVerification}
      onStartRunButtonClicked={onStartRunButtonClicked}
    />
  );
}
