import cloneDeep from "lodash/cloneDeep";
import find from "lodash/find";
import findIndex from "lodash/findIndex";
import remove from "lodash/remove";
import { useEffect, useState } from "react";
import { useFetcher, useLocation, useNavigate } from "react-router";
import type { Run, RunSession } from "~/modules/runs/runs.types";
import RunSessionViewer from "../components/runSessionViewer";
import getSessionVerificationChanges from "../helpers/getSessionVerificationChanges";
import markUtterancesByAnnotationFilters from "../helpers/markUtterancesByAnnotationFilters";
import type {
  Annotation,
  AnnotationFilter,
  AnnotationFilterSettings,
  SessionFile,
} from "../sessions.types";

export default function RunSessionViewerContainer({
  run,
  session,
  sessionFile,
}: {
  run: Run;
  session: RunSession;
  sessionFile: SessionFile;
}) {
  const { hash } = useLocation();
  const navigate = useNavigate();

  const [shouldShowVerificationDetails, setShowVerificationDetails] =
    useState(false);

  const [annotationFilters, setAnnotationFilters] = useState<
    AnnotationFilter[]
  >([]);

  const [annotationFilterSettings, setAnnotationFilterSettings] =
    useState<AnnotationFilterSettings>({
      previousContextCount: 0,
      nextContextCount: 0,
    });

  const fetcher = useFetcher();

  const utteranceCount = sessionFile.transcript.length;
  const annotatedUtteranceCount = sessionFile.transcript.filter(
    (u) => u.annotations && u.annotations.length > 0,
  ).length;
  const annotatedUtterances = sessionFile.transcript.filter(
    (u) => u.annotations && u.annotations.length > 0,
  );

  markUtterancesByAnnotationFilters({
    transcript: sessionFile.transcript,
    annotationFilters,
    previousContextCount: annotationFilterSettings.previousContextCount,
    nextContextCount: annotationFilterSettings.nextContextCount,
  });

  const filteredAnnotatedUtterances =
    annotationFilters.length > 0
      ? annotatedUtterances.filter((u) => u.isFiltered)
      : annotatedUtterances;
  const filteredAnnotatedUtteranceCount = filteredAnnotatedUtterances.length;

  const verificationChanges = getSessionVerificationChanges(run, sessionFile);

  const removedAnnotationUtteranceIds = new Set(
    verificationChanges?.removed.map((a) => a._id) ?? [],
  );

  const hashUtteranceId = hash
    ? hash.replace("#session-viewer-utterance-", "")
    : null;
  const hashUtteranceIndex = hashUtteranceId
    ? findIndex(filteredAnnotatedUtterances, { _id: hashUtteranceId })
    : -1;
  const selectedUtteranceId =
    hashUtteranceIndex !== -1 ||
    (hashUtteranceId !== null &&
      removedAnnotationUtteranceIds.has(hashUtteranceId))
      ? hashUtteranceId
      : null;
  const selectedUtteranceIndex =
    hashUtteranceIndex !== -1 ? hashUtteranceIndex : null;

  const navigateToUtterance = (utteranceId: string) => {
    navigate(`#session-viewer-utterance-${utteranceId}`, { replace: true });
  };

  const onUtteranceClicked = (utteranceId: string) => {
    const newIndex = findIndex(filteredAnnotatedUtterances, {
      _id: utteranceId,
    });
    if (newIndex !== -1 || removedAnnotationUtteranceIds.has(utteranceId)) {
      navigateToUtterance(utteranceId);
    }
  };

  const onPreviousAnnotationClicked = () => {
    if (selectedUtteranceIndex !== null && selectedUtteranceIndex > 0) {
      navigateToUtterance(
        filteredAnnotatedUtterances[selectedUtteranceIndex - 1]._id,
      );
    }
  };

  const onNextAnnotationClicked = () => {
    if (selectedUtteranceIndex === null) {
      if (filteredAnnotatedUtterances.length > 0) {
        navigateToUtterance(filteredAnnotatedUtterances[0]._id);
      }
      return;
    }
    if (selectedUtteranceIndex < filteredAnnotatedUtterances.length - 1) {
      navigateToUtterance(
        filteredAnnotatedUtterances[selectedUtteranceIndex + 1]._id,
      );
    }
  };

  const onDownVoteClicked = (utteranceId: string, annotationIndex: number) => {
    fetcher.submit(
      { markedAs: "DOWN_VOTED" },
      {
        action: `/api/annotations/${run._id}/${session.sessionId}/${utteranceId}/${annotationIndex}`,
        method: "post",
        encType: "application/json",
      },
    );
  };

  const onUpVoteClicked = (utteranceId: string, annotationIndex: number) => {
    fetcher.submit(
      { markedAs: "UP_VOTED" },
      {
        action: `/api/annotations/${run._id}/${session.sessionId}/${utteranceId}/${annotationIndex}`,
        method: "post",
        encType: "application/json",
      },
    );
  };

  const reasonFetcher = useFetcher();

  const onSaveVotingReason = (
    utteranceId: string,
    annotationIndex: number,
    reason: string,
  ) => {
    reasonFetcher.submit(
      { votingReason: reason },
      {
        action: `/api/annotations/${run._id}/${session.sessionId}/${utteranceId}/${annotationIndex}`,
        method: "post",
        encType: "application/json",
      },
    );
  };

  const isVoting = fetcher.state !== "idle";
  const isSavingReason = reasonFetcher.state !== "idle";

  useEffect(() => {
    if (selectedUtteranceId) {
      const element = document.getElementById(
        `session-viewer-utterance-${selectedUtteranceId}`,
      );
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } else {
      const container = document.getElementById(
        "session-viewer-scroll-container",
      );
      if (container) container.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [selectedUtteranceId]);

  let selectedUtteranceAnnotations: Annotation[] = [];

  if (selectedUtteranceId) {
    const selectedUtterance = find(sessionFile.transcript, {
      _id: selectedUtteranceId,
    });
    if (selectedUtterance) {
      selectedUtteranceAnnotations = selectedUtterance.annotations || [];
    }
  }
  const removedAnnotationsForSelectedUtterance = selectedUtteranceId
    ? (verificationChanges?.removed.filter(
        (a) => a._id === selectedUtteranceId,
      ) ?? [])
    : [];

  const onJumpToFirstAnnotation = () => {
    if (filteredAnnotatedUtterances.length > 0) {
      navigateToUtterance(filteredAnnotatedUtterances[0]._id);
    }
  };

  const onAddAnnotationFilter = (annotationFilter: AnnotationFilter) => {
    const clonedAnnotationFilters = cloneDeep(annotationFilters);
    if (!find(annotationFilters, annotationFilter)) {
      clonedAnnotationFilters.push(annotationFilter);
    }
    setAnnotationFilters(clonedAnnotationFilters);
  };

  const onRemoveAnnotationFilter = (annotationFilter: AnnotationFilter) => {
    const clonedAnnotationFilters = cloneDeep(annotationFilters);
    remove(clonedAnnotationFilters, annotationFilter);
    setAnnotationFilters(clonedAnnotationFilters);
  };

  const onRemoveFiltersClicked = () => {
    setAnnotationFilters([]);
  };

  const onAnnotationFilterSettingsChanged = (
    annotationFilterSettings: AnnotationFilterSettings,
  ) => {
    setAnnotationFilterSettings(annotationFilterSettings);
  };

  return (
    <RunSessionViewer
      session={session}
      sessionFile={sessionFile}
      selectedUtteranceId={selectedUtteranceId}
      selectedUtteranceAnnotations={selectedUtteranceAnnotations}
      removedAnnotations={removedAnnotationsForSelectedUtterance}
      isVoting={isVoting}
      utteranceCount={utteranceCount}
      annotatedUtteranceCount={annotatedUtteranceCount}
      filteredAnnotatedUtteranceCount={filteredAnnotatedUtteranceCount}
      selectedUtteranceIndex={selectedUtteranceIndex}
      run={run}
      annotationFilters={annotationFilters}
      annotationFilterSettings={annotationFilterSettings}
      shouldShowVerificationDetails={shouldShowVerificationDetails}
      onToggleVerificationDetails={() => setShowVerificationDetails((v) => !v)}
      onUtteranceClicked={onUtteranceClicked}
      onPreviousAnnotationClicked={onPreviousAnnotationClicked}
      onNextAnnotationClicked={onNextAnnotationClicked}
      onJumpToFirstAnnotation={onJumpToFirstAnnotation}
      onDownVoteClicked={onDownVoteClicked}
      onUpVoteClicked={onUpVoteClicked}
      onSaveVotingReason={onSaveVotingReason}
      isSavingReason={isSavingReason}
      onAddAnnotationFilter={onAddAnnotationFilter}
      onRemoveAnnotationFilter={onRemoveAnnotationFilter}
      onRemoveFiltersClicked={onRemoveFiltersClicked}
      onAnnotationFilterSettingsChanged={onAnnotationFilterSettingsChanged}
    />
  );
}
