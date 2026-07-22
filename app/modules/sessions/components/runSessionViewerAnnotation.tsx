import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import clsx from "clsx";
import map from "lodash/map";
import { Check, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import type { Annotation } from "../sessions.types";
import SessionViewerAnnotationValue from "./runSessionViewerAnnotationValue";
import SessionViewerAnnotationVerificationStatus from "./runSessionViewerAnnotationVerificationStatus";

const HIDDEN_ANNOTATION_KEYS = new Set([
  "_id",
  "identifiedBy",
  "markedAs",
  "votingReason",
]);

export default function SessionViewerAnnotation({
  annotation,
  preAnnotation,
  isRemovedByVerification = false,
  isAddedByVerification = false,
  isChangedByVerification = false,
  isVoting,
  isSavingReason,
  onDownVoteClicked,
  onUpVoteClicked,
  onSaveVotingReason,
}: {
  annotation: Annotation;
  preAnnotation?: Annotation;
  isRemovedByVerification?: boolean;
  isAddedByVerification?: boolean;
  isChangedByVerification?: boolean;
  isVoting: boolean;
  isSavingReason: boolean;
  onDownVoteClicked: () => void;
  onUpVoteClicked: () => void;
  onSaveVotingReason: (reason: string) => void;
}) {
  const [reason, setReason] = useState(annotation.votingReason || "");

  const hasVoted = !!annotation.markedAs;
  const hasUnsavedChanges = reason !== (annotation.votingReason || "");

  return (
    <div className="bg-muted mb-2 rounded-md p-4">
      <SessionViewerAnnotationVerificationStatus
        isRemovedByVerification={isRemovedByVerification}
        isChangedByVerification={isChangedByVerification}
        isAddedByVerification={isAddedByVerification}
      />
      {map(annotation, (annotationValue, annotationKey) => {
        if (HIDDEN_ANNOTATION_KEYS.has(annotationKey)) {
          return null;
        }

        const previousValue = preAnnotation?.[annotationKey];
        const hasChanged =
          isChangedByVerification &&
          previousValue !== undefined &&
          String(previousValue) !== String(annotationValue);

        return (
          <div className="mb-2" key={annotationKey}>
            <div className="text-muted-foreground text-caption">
              {annotationKey}
            </div>
            {hasChanged && (
              <div className="text-muted-foreground text-caption line-through">
                <SessionViewerAnnotationValue value={previousValue} />
              </div>
            )}
            <SessionViewerAnnotationValue value={annotationValue} />
          </div>
        );
      })}
      <div className="flex items-center justify-between">
        <div>
          <Badge>{`Identified by ${annotation.identifiedBy}`}</Badge>
        </div>
        {!isRemovedByVerification && (
          <div className="flex items-center gap-x-4">
            <Button
              variant="outline"
              size="icon"
              aria-label="Downvote annotation"
              aria-pressed={annotation.markedAs === "DOWN_VOTED"}
              disabled={isVoting}
              onClick={onDownVoteClicked}
              className={clsx({
                "border-sandpiper-accent": annotation.markedAs === "DOWN_VOTED",
              })}
            >
              <ThumbsDown
                size={10}
                className={clsx({
                  "stroke-sandpiper-accent":
                    annotation.markedAs === "DOWN_VOTED",
                })}
              />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Upvote annotation"
              aria-pressed={annotation.markedAs === "UP_VOTED"}
              disabled={isVoting}
              onClick={onUpVoteClicked}
              className={clsx({
                "border-sandpiper-accent": annotation.markedAs === "UP_VOTED",
              })}
            >
              <ThumbsUp
                size={10}
                className={clsx({
                  "stroke-sandpiper-accent": annotation.markedAs === "UP_VOTED",
                })}
              />
            </Button>
          </div>
        )}
      </div>
      {hasVoted && (
        <div className="mt-3 flex gap-2">
          <Textarea
            placeholder="Reason for your decision..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isSavingReason}
            maxLength={280}
            className="text-caption min-h-[60px]"
          />
          <Button
            variant="outline"
            size="icon"
            aria-label="Save reason"
            disabled={isSavingReason || !hasUnsavedChanges}
            onClick={() => onSaveVotingReason(reason)}
            className="shrink-0"
          >
            <Check size={14} />
          </Button>
        </div>
      )}
    </div>
  );
}
