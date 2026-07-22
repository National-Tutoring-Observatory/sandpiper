import { Button } from "@/components/ui/button";
import { BadgeCheck, BadgeMinus, BadgePlus } from "lucide-react";

export default function SessionViewerUtteranceVerificationDetails({
  hasChangedAnnotation,
  hasAddedAnnotation,
  hasRemovedAnnotation,
  onUtteranceClicked,
}: {
  hasChangedAnnotation?: boolean;
  hasAddedAnnotation?: boolean;
  hasRemovedAnnotation?: boolean;
  onUtteranceClicked: () => void;
}) {
  return (
    <>
      {hasChangedAnnotation && (
        <div className="text-caption ml-2 flex items-center text-amber-500">
          <BadgeCheck className="mr-1 size-3" />
          Changed by verification
        </div>
      )}
      {hasAddedAnnotation && (
        <div className="text-caption ml-2 flex items-center text-green-600">
          <BadgePlus className="mr-1 size-3" />
          Added by verification
        </div>
      )}
      {hasRemovedAnnotation && (
        <Button
          variant="link"
          size={"sm"}
          className="text-destructive decoration-destructive ml-4"
          onClick={onUtteranceClicked}
        >
          <div className="text-destructive text-caption flex items-center">
            <BadgeMinus className="mr-1 size-3" />
            Removed by verification
          </div>
        </Button>
      )}
    </>
  );
}
