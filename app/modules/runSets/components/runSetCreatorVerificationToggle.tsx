import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export default function RunSetCreatorVerification({
  shouldRunVerification,
  onShouldRunVerificationChanged,
}: {
  shouldRunVerification: boolean;
  onShouldRunVerificationChanged: (value: boolean) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="font-bold">Verification</Label>
      <div className="flex items-center gap-3">
        <Checkbox
          id="shouldRunVerification"
          checked={shouldRunVerification}
          onCheckedChange={(checked) =>
            onShouldRunVerificationChanged(Boolean(checked))
          }
        />
        <Label htmlFor="shouldRunVerification">Enable verification step</Label>
      </div>
      <p className="text-muted-foreground text-sm">
        When enabled, annotations are verified by a second LLM pass to check for
        accuracy. This significantly improves results but roughly doubles the
        cost on average.
      </p>
    </div>
  );
}
