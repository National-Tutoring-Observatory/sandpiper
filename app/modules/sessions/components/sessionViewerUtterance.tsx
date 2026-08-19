import { Button } from "@/components/ui/button";
import clsx from "clsx";
import { NotebookPen } from "lucide-react";
import getUtteranceDetails from "../helpers/getUtteranceDetails";
import type { Utterance } from "../sessions.types";
import SessionViewerUtteranceVerificationDetails from "./sessionViewerUtteranceVerificationDetails";

export default function SessionViewerUtterance({
  utterance,
  utteranceNumber,
  leadRole = "TEACHER",
  isSelected,
  hasChangedAnnotation,
  hasAddedAnnotation,
  hasRemovedAnnotation,
  shouldShowVerificationDetails,
  onUtteranceClicked,
}: {
  utterance: Utterance;
  utteranceNumber: number;
  leadRole: string;
  isSelected: boolean;
  hasChangedAnnotation?: boolean;
  hasAddedAnnotation?: boolean;
  hasRemovedAnnotation?: boolean;
  shouldShowVerificationDetails: boolean;
  onUtteranceClicked: (utteranceId: string) => void;
}) {
  return (
    <div
      key={utterance._id}
      className={clsx("mb-4 flex", {
        "justify-start": utterance.role === leadRole,
        "justify-end": utterance.role !== leadRole,
      })}
    >
      <div className="flex max-w-7/8 flex-col">
        <div
          id={`session-viewer-utterance-${utterance._id}`}
          className={clsx(
            "text-body-lg scroll-mt-4 rounded-4xl border p-4 wrap-anywhere",
            {
              "border-sandpiper-accent/30 bg-sandpiper-accent/10": isSelected,
              "bg-sandpiper-elevated rounded-bl-none":
                !isSelected && utterance.role === leadRole,
              "border-sandpiper-surface bg-sandpiper-surface rounded-br-none":
                !isSelected && utterance.role !== leadRole,
            },
          )}
        >
          {utterance.content}
        </div>
        <div className="text-caption text-muted-foreground mt-1 flex min-h-8 flex-wrap items-center">
          <div>
            #{utteranceNumber} · {getUtteranceDetails({ utterance })}
          </div>
          {utterance.annotations.length > 0 && (
            <Button
              variant="link"
              size={"sm"}
              className="decoration-sandpiper-accent"
              onClick={() => onUtteranceClicked(utterance._id)}
            >
              <div className="text-sandpiper-accent decoration-sandpiper-accent text-caption ml-4 flex items-center">
                <NotebookPen className="mr-1 size-3" />
                {utterance.annotations.length} annotation
                {utterance.annotations.length > 1 ? "s" : ""}
              </div>
            </Button>
          )}
          {shouldShowVerificationDetails && (
            <SessionViewerUtteranceVerificationDetails
              hasChangedAnnotation={hasChangedAnnotation}
              hasAddedAnnotation={hasAddedAnnotation}
              hasRemovedAnnotation={hasRemovedAnnotation}
              onUtteranceClicked={() => onUtteranceClicked(utterance._id)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
