import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { AnnotationFilterSettings } from "../sessions.types";

const CONTEXT_COUNT_OPTIONS = ["0", "1", "2", "3", "4", "5"];

export default function RunSessionAnnotationFilterSettings({
  annotationFilterSettings,
  onAnnotationFilterSettingsChanged,
}: {
  annotationFilterSettings: AnnotationFilterSettings;
  onAnnotationFilterSettingsChanged: (
    annotationFilterSettings: AnnotationFilterSettings,
  ) => void;
}) {
  return (
    <div className="rounded border p-2">
      <p className="mb-2 text-xs">
        Choose how many utterances you would like to show before and after the
        filtered utterances.
      </p>
      <div className="flex justify-between gap-2">
        <div className="flex flex-col gap-1">
          <Label id="previous-context-count" className="text-bold text-xs">
            Before
          </Label>
          <ToggleGroup
            type="single"
            variant="outline"
            aria-labelledby="previous-context-count"
            value={String(annotationFilterSettings.previousContextCount)}
            onValueChange={(value) => {
              if (!value) return;
              onAnnotationFilterSettingsChanged({
                ...annotationFilterSettings,
                previousContextCount: Number(value),
              });
            }}
          >
            {CONTEXT_COUNT_OPTIONS.map((option) => (
              <ToggleGroupItem key={option} value={option}>
                {option}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div className="flex flex-col gap-1">
          <Label id="next-context-count" className="text-bold text-xs">
            After
          </Label>
          <ToggleGroup
            type="single"
            variant="outline"
            aria-labelledby="next-context-count"
            value={String(annotationFilterSettings.nextContextCount)}
            onValueChange={(value) => {
              if (!value) return;
              onAnnotationFilterSettingsChanged({
                ...annotationFilterSettings,
                nextContextCount: Number(value),
              });
            }}
          >
            {CONTEXT_COUNT_OPTIONS.map((option) => (
              <ToggleGroupItem key={option} value={option}>
                {option}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>
    </div>
  );
}
