import { Switch } from "@/components/ui/switch";
import type { VerificationChanges } from "../helpers/getVerificationChanges";

export default function SessionVerification({
  verificationChanges,
  shouldShowVerificationDetails,
  onToggleVerificationDetails,
}: {
  verificationChanges: VerificationChanges;
  shouldShowVerificationDetails: boolean;
  onToggleVerificationDetails: () => void;
}) {
  return (
    <div className="py-2">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span className="text-muted-foreground text-heading">Verification</span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-body whitespace-nowrap">
            Show verifications
          </span>
          <Switch
            checked={shouldShowVerificationDetails}
            onCheckedChange={onToggleVerificationDetails}
          />
        </div>
      </div>
      <div className="text-muted-foreground text-caption mt-1">
        {verificationChanges.changed.length} changed,{" "}
        {verificationChanges.added.length} added,{" "}
        {verificationChanges.removed.length} removed
      </div>
    </div>
  );
}
