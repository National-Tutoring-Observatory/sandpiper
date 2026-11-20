import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FilterIcon } from "lucide-react";
import type { AnnotationSchemaItem } from "~/modules/prompts/prompts.types";
import type {
  AnnotationFilter,
  AnnotationFilterSettings,
} from "../sessions.types";
import RunSessionAnnotationFilterForm from "./runSessionAnnotationFilterForm";
import RunSessionAnnotationFilterList from "./runSessionAnnotationFilterList";
import RunSessionAnnotationFilterSettings from "./runSessionAnnotationFilterSettings";

const RunSessionAnnotationFilter = ({
  annotationFilters,
  annotationFilterSettings,
  availableFilters,
  selectedFilterKey,
  selectedFilterValue,
  onSelectedFilterKeyChanged,
  onSelectedFilterValueChanged,
  onAddFilterClicked,
  onRemoveFilterClicked,
  onAnnotationFilterSettingsChanged,
}: {
  annotationFilters: AnnotationFilter[];
  annotationFilterSettings: AnnotationFilterSettings;
  availableFilters: AnnotationSchemaItem[];
  selectedFilterKey?: string;
  selectedFilterValue?: string | number;
  onSelectedFilterKeyChanged: (selectedFilterKey: string) => void;
  onSelectedFilterValueChanged: (selectedFilterValue: string | number) => void;
  onAddFilterClicked: () => void;
  onRemoveFilterClicked: (annotationFilter: AnnotationFilter) => void;
  onAnnotationFilterSettingsChanged: (
    annotationFilterSettings: AnnotationFilterSettings,
  ) => void;
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="data-[state=open]:bg-muted relative rounded-full bg-white shadow"
        >
          <FilterIcon />
          {annotationFilters.length > 0 && (
            <Badge className="bg-sandpiper-accent absolute -top-1 -right-1 h-4 min-w-4 rounded-full px-1 text-[10px] leading-none text-white tabular-nums">
              {annotationFilters.length}
            </Badge>
          )}
          <span className="sr-only">Filter annotations</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="flex w-xl flex-col gap-2 p-2">
        <RunSessionAnnotationFilterList
          annotationFilters={annotationFilters}
          onRemoveFilterClicked={onRemoveFilterClicked}
        />
        {annotationFilters.length > 0 && (
          <RunSessionAnnotationFilterSettings
            annotationFilterSettings={annotationFilterSettings}
            onAnnotationFilterSettingsChanged={
              onAnnotationFilterSettingsChanged
            }
          />
        )}
        <RunSessionAnnotationFilterForm
          availableFilters={availableFilters}
          selectedFilterKey={selectedFilterKey}
          selectedFilterValue={selectedFilterValue}
          onSelectedFilterKeyChanged={onSelectedFilterKeyChanged}
          onSelectedFilterValueChanged={onSelectedFilterValueChanged}
          onAddFilterClicked={onAddFilterClicked}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default RunSessionAnnotationFilter;
