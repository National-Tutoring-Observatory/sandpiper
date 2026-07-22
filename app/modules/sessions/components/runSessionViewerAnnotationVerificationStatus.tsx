import { BadgeCheck, BadgeMinus, BadgePlus } from "lucide-react";

export default function SessionViewerAnnotationVerificationStatus({
  isRemovedByVerification,
  isChangedByVerification,
  isAddedByVerification,
}: {
  isRemovedByVerification?: boolean;
  isChangedByVerification?: boolean;
  isAddedByVerification?: boolean;
}) {
  if (
    !isRemovedByVerification &&
    !isChangedByVerification &&
    !isAddedByVerification
  ) {
    return null;
  }

  return (
    <div className="mb-3">
      {isChangedByVerification && (
        <div className="text-caption flex items-center text-amber-500">
          <BadgeCheck className="mr-1 size-3" />
          Changed by verification
        </div>
      )}
      {isAddedByVerification && (
        <div className="text-caption flex items-center text-green-600">
          <BadgePlus className="mr-1 size-3" />
          Added by verification
        </div>
      )}
      {isRemovedByVerification && (
        <div className="text-destructive text-caption flex items-center">
          <BadgeMinus className="mr-1 size-3" />
          Removed by verification
        </div>
      )}
    </div>
  );
}
