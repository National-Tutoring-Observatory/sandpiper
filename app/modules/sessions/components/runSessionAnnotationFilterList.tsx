import { Button } from "@/components/ui/button";
import map from "lodash/map";
import { X } from "lucide-react";
import type { AnnotationFilter } from "../sessions.types";

export default function RunSessionAnnotationFilterList({
  annotationFilters,
  onRemoveFilterClicked,
}: {
  annotationFilters: AnnotationFilter[];
  onRemoveFilterClicked: (annotationFilter: AnnotationFilter) => void;
}) {
  return (
    <div>
      <div className="text-sm font-bold">Filters</div>
      <p className="text-sm">
        Apply filters to show only utterances that contain matching annotations.
      </p>
      {map(annotationFilters, (annotationFilter: AnnotationFilter) => {
        return (
          <div
            key={`${annotationFilter.fieldKey}-${annotationFilter.value}`}
            className="flex items-center justify-between gap-2 border-b py-2"
          >
            <div className="text-sm">{annotationFilter.fieldKey}</div>
            <div className="flex items-center gap-x-1">
              <div className="rounded-2xl border p-2 text-xs">
                <code>{`${annotationFilter.value}`}</code>
              </div>
              <Button
                variant={"ghost"}
                size="icon"
                onClick={() => onRemoveFilterClicked(annotationFilter)}
              >
                <X />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
