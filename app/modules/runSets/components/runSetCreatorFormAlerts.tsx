import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import type { PrefillData } from "~/modules/runSets/runSets.types";

export default function RunSetCreatorFormAlerts({
  errors,
  prefillData,
}: {
  errors: Record<string, string>;
  prefillData?: PrefillData | null;
}) {
  return (
    <>
      {prefillData && (
        <Alert
          variant={
            prefillData.validationErrors?.length ? "destructive" : "default"
          }
        >
          <Info className="h-4 w-4" />
          <AlertTitle>Creating from template</AlertTitle>
          <AlertDescription>
            <p>
              Fields pre-filled from{" "}
              {prefillData.sourceRunSetName ? "run set" : "run"} "
              {prefillData.sourceRunSetName || prefillData.sourceRunName}". You
              can modify any field before creating.
            </p>
            {prefillData.validationErrors?.length ? (
              <ul className="mt-2 list-inside list-disc">
                {prefillData.validationErrors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            ) : null}
          </AlertDescription>
        </Alert>
      )}

      {Object.keys(errors).length > 0 && (
        <div className="border-sandpiper-destructive/20 bg-sandpiper-destructive/5 rounded-lg border p-4">
          <h3 className="text-sandpiper-destructive text-heading mb-2 font-semibold">
            Errors
          </h3>
          <ul className="text-sandpiper-destructive/80 text-body space-y-1">
            {Object.entries(errors).map(([field, message]) => (
              <li key={field}>• {message}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
