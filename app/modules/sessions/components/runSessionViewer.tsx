import { Button } from "@/components/ui/button";
import { SkipLink } from "@/components/ui/skipLink";
import find from "lodash/find";
import map from "lodash/map";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Run, RunSession } from "~/modules/runs/runs.types";
import RunSessionAnnotationFilterContainer from "../containers/runSessionAnnotationFilterContainer";
import SessionVerificationContainer from "../containers/sessionVerificationContainer";
import getSessionVerificationChanges from "../helpers/getSessionVerificationChanges";
import type {
  Annotation,
  AnnotationFilter,
  SessionFile,
  Utterance,
} from "../sessions.types";
import SessionViewerAnnotation from "./runSessionViewerAnnotation";
import SessionViewerDetails from "./runSessionViewerDetails";
import SessionViewerUtterance from "./sessionViewerUtterance";

export default function SessionViewer({
  run,
  session,
  sessionFile,
  selectedUtteranceId,
  selectedUtteranceAnnotations,
  removedAnnotations,
  annotationFilters,
  isVoting,
  utteranceCount,
  selectedUtteranceIndex,
  annotatedUtteranceCount,
  shouldShowVerificationDetails,
  isSavingReason,
  onToggleVerificationDetails,
  onUtteranceClicked,
  onPreviousAnnotationClicked,
  onNextAnnotationClicked,
  onJumpToFirstAnnotation,
  onDownVoteClicked,
  onUpVoteClicked,
  onSaveVotingReason,
  onAddAnnotationFilter,
  onRemoveAnnotationFilter,
}: {
  run: Run;
  session: RunSession;
  sessionFile: SessionFile;
  selectedUtteranceAnnotations: Annotation[];
  removedAnnotations: Annotation[];
  annotationFilters: AnnotationFilter[];
  onAddAnnotationFilter: (annotationFilter: AnnotationFilter) => void;
  onRemoveAnnotationFilter: (annotationFilter: AnnotationFilter) => void;
  selectedUtteranceId: string | null;
  isVoting: boolean;
  isSavingReason: boolean;
  utteranceCount: number;
  selectedUtteranceIndex: number | null;
  annotatedUtteranceCount: number;
  shouldShowVerificationDetails: boolean;
  onToggleVerificationDetails: () => void;
  onUtteranceClicked: (utteranceId: string) => void;
  onPreviousAnnotationClicked: () => void;
  onNextAnnotationClicked: () => void;
  onJumpToFirstAnnotation: () => void;
  onDownVoteClicked: (utteranceId: string, annotationIndex: number) => void;
  onUpVoteClicked: (utteranceId: string, annotationIndex: number) => void;
  onSaveVotingReason: (
    utteranceId: string,
    annotationIndex: number,
    reason: string,
  ) => void;
}) {
  const hasSelectedAnnotation = selectedUtteranceIndex !== null;

  const verificationChanges = getSessionVerificationChanges(run, sessionFile);

  const getPreAnnotation = (annotation: Annotation) =>
    find(
      verificationChanges?.changed,
      (c: { after: Annotation; before: Annotation }) =>
        c.after._id === annotation._id,
    )?.before ?? undefined;

  const isAddedAnnotation = (annotation: Annotation) =>
    verificationChanges?.added.some((a) => a._id === annotation._id) ?? false;

  const isChangedAnnotation = (annotation: Annotation) =>
    verificationChanges?.changed.some((c) => c.after._id === annotation._id) ??
    false;

  const isPerUtterance = run.annotationType === "PER_UTTERANCE";

  return (
    <div className="flex h-full flex-1">
      <SkipLink href="#session-annotations-panel" className="focus:p-2">
        Skip to annotations
      </SkipLink>
      <div
        id="session-viewer-scroll-container"
        className="flex h-full w-[55%] min-w-0 flex-col overflow-y-scroll scroll-smooth border-r"
      >
        {isPerUtterance && (
          <div className="sticky top-0 flex justify-end px-4 pt-2">
            <RunSessionAnnotationFilterContainer
              annotationFilters={annotationFilters}
              annotationSchema={run.snapshot?.prompt.annotationSchema ?? []}
              onAddAnnotationFilter={onAddAnnotationFilter}
              onRemoveAnnotationFilter={onRemoveAnnotationFilter}
            />
          </div>
        )}
        <div className="p-4">
          {map(
            sessionFile.transcript,
            (utterance: Utterance, index: number) => {
              const isSelected = selectedUtteranceId === utterance._id;
              const hasChangedAnnotation =
                isPerUtterance &&
                verificationChanges?.changed.some(
                  (c) => c.after._id === utterance._id,
                );
              const hasAddedAnnotation =
                isPerUtterance &&
                verificationChanges?.added.some((a) => a._id === utterance._id);
              const hasRemovedAnnotation =
                isPerUtterance &&
                verificationChanges?.removed.some(
                  (r) => r._id === utterance._id,
                );

              if (
                annotationFilters.length > 0 &&
                !utterance.isFiltered &&
                !utterance.isNeighbourFiltered
              )
                return null;
              return (
                <SessionViewerUtterance
                  key={utterance._id}
                  utteranceNumber={index + 1}
                  leadRole={sessionFile.leadRole}
                  utterance={utterance}
                  isSelected={isSelected}
                  isFiltered={utterance.isFiltered}
                  isNeighbourFiltered={utterance.isNeighbourFiltered}
                  hasChangedAnnotation={hasChangedAnnotation}
                  hasAddedAnnotation={hasAddedAnnotation}
                  hasRemovedAnnotation={hasRemovedAnnotation}
                  shouldShowVerificationDetails={shouldShowVerificationDetails}
                  onUtteranceClicked={onUtteranceClicked}
                />
              );
            },
          )}
        </div>
      </div>
      <div
        id="session-annotations-panel"
        tabIndex={-1}
        className="flex h-full w-[45%] min-w-0 flex-col overflow-y-auto pt-4"
      >
        <div className="border-b px-4 pb-4">
          <SessionViewerDetails
            session={session}
            utteranceCount={utteranceCount}
            annotatedUtteranceCount={annotatedUtteranceCount}
          />
          <SessionVerificationContainer
            run={run}
            sessionFile={sessionFile}
            shouldShowVerificationDetails={shouldShowVerificationDetails}
            onToggleVerificationDetails={onToggleVerificationDetails}
          />
        </div>
        {sessionFile.annotations && sessionFile.annotations.length > 0 && (
          <div className="flex flex-col p-4 pb-0">
            <div className="text-muted-foreground text-heading mb-2 font-semibold">
              Session annotations
            </div>
            <div>
              {map(sessionFile.annotations, (annotation, index) => {
                return (
                  <SessionViewerAnnotation
                    key={`${annotation._id}-${index}-${annotation.votingReason || ""}`}
                    annotation={annotation}
                    preAnnotation={getPreAnnotation(annotation)}
                    isAddedByVerification={
                      shouldShowVerificationDetails &&
                      isAddedAnnotation(annotation)
                    }
                    isChangedByVerification={
                      shouldShowVerificationDetails &&
                      isChangedAnnotation(annotation)
                    }
                    isVoting={isVoting}
                    isSavingReason={isSavingReason}
                    onDownVoteClicked={() =>
                      onDownVoteClicked(annotation._id, index)
                    }
                    onUpVoteClicked={() =>
                      onUpVoteClicked(annotation._id, index)
                    }
                    onSaveVotingReason={(reason) =>
                      onSaveVotingReason(annotation._id, index, reason)
                    }
                  />
                );
              })}
            </div>
          </div>
        )}
        {(annotatedUtteranceCount > 0 ||
          (shouldShowVerificationDetails && removedAnnotations.length > 0)) && (
          <div className="flex flex-col p-4 pb-0">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <div className="text-heading font-semibold">
                  View Annotations
                </div>
                <p className="text-muted-foreground text-caption">
                  Browse annotations in this session
                </p>
              </div>
            </div>
            <div className="my-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button
                  variant="outline"
                  className="text-body"
                  onClick={onJumpToFirstAnnotation}
                >
                  First annotation
                </Button>
                <div
                  aria-live="polite"
                  aria-atomic="true"
                  className="text-muted-foreground text-body"
                >
                  {hasSelectedAnnotation
                    ? `${selectedUtteranceIndex + 1}/${annotatedUtteranceCount}`
                    : ""}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label="Previous annotation"
                    onClick={onPreviousAnnotationClicked}
                    disabled={
                      !hasSelectedAnnotation || selectedUtteranceIndex == 0
                    }
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label="Next annotation"
                    onClick={onNextAnnotationClicked}
                    disabled={
                      hasSelectedAnnotation &&
                      selectedUtteranceIndex == annotatedUtteranceCount - 1
                    }
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div>
              {map(selectedUtteranceAnnotations, (annotation, index) => {
                return (
                  <SessionViewerAnnotation
                    key={`${annotation._id}-${index}-${annotation.votingReason || ""}`}
                    annotation={annotation}
                    preAnnotation={getPreAnnotation(annotation)}
                    isAddedByVerification={
                      shouldShowVerificationDetails &&
                      isAddedAnnotation(annotation)
                    }
                    isChangedByVerification={
                      shouldShowVerificationDetails &&
                      isChangedAnnotation(annotation)
                    }
                    isVoting={isVoting}
                    isSavingReason={isSavingReason}
                    onDownVoteClicked={() =>
                      onDownVoteClicked(annotation._id, index)
                    }
                    onUpVoteClicked={() =>
                      onUpVoteClicked(annotation._id, index)
                    }
                    onSaveVotingReason={(reason) =>
                      onSaveVotingReason(annotation._id, index, reason)
                    }
                  />
                );
              })}
              {shouldShowVerificationDetails &&
                map(removedAnnotations, (annotation, index) => {
                  return (
                    <SessionViewerAnnotation
                      key={`removed-${annotation._id}-${index}`}
                      annotation={annotation}
                      isRemovedByVerification
                      isVoting={false}
                      isSavingReason={false}
                      onDownVoteClicked={() => {}}
                      onUpVoteClicked={() => {}}
                      onSaveVotingReason={() => {}}
                    />
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
