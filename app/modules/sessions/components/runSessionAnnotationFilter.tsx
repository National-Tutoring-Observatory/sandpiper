import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import find from "lodash/find";
import map from "lodash/map";
import { FilterIcon, X } from "lucide-react";
import type { AnnotationSchemaItem } from "~/modules/prompts/prompts.types";
import type { AnnotationFilter } from "../sessions.types";

const RunSessionAnnotationFilter = ({
  annotationFilters,
  availableFilters,
  selectedFilterKey,
  selectedFilterValue,
  onSelectedFilterKeyChanged,
  onSelectedFilterValueChanged,
  onAddFilterClicked,
  onRemoveFilterClicked,
}: {
  annotationFilters: AnnotationFilter[];
  availableFilters: AnnotationSchemaItem[];
  selectedFilterKey?: string;
  selectedFilterValue?: string;
  onSelectedFilterKeyChanged: (selectedFilterKey: string) => void;
  onSelectedFilterValueChanged: (selectedFilterValue: string) => void;
  onAddFilterClicked: () => void;
  onRemoveFilterClicked: (annotationFilter: AnnotationFilter) => void;
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
      <DropdownMenuContent align="end" className="flex flex-col gap-2 p-2">
        <div>
          <div className="text-sm font-bold">Filters</div>
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
        <div className="flex gap-2">
          <Select
            value={selectedFilterKey}
            onValueChange={onSelectedFilterKeyChanged}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select a field" />
            </SelectTrigger>
            <SelectContent>
              {availableFilters.map((availableFilter) => (
                <SelectItem
                  key={availableFilter.fieldKey}
                  value={availableFilter.fieldKey}
                >
                  {availableFilter.fieldKey}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedFilterValue}
            onValueChange={onSelectedFilterValueChanged}
            disabled={!selectedFilterKey}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select a value" />
            </SelectTrigger>
            <SelectContent>
              {find(availableFilters, { fieldKey: selectedFilterKey })
                ?.fieldType === "boolean" && (
                <>
                  <SelectItem value={"false"}>False</SelectItem>
                  <SelectItem value={"true"}>True</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
          <Button onClick={onAddFilterClicked}>Add filter</Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default RunSessionAnnotationFilter;
