import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import find from "lodash/find";
import type { AnnotationSchemaItem } from "~/modules/prompts/prompts.types";

export default function RunSessionAnnotationFilterForm({
  availableFilters,
  selectedFilterKey,
  selectedFilterValue,
  onSelectedFilterKeyChanged,
  onSelectedFilterValueChanged,
  onAddFilterClicked,
}: {
  availableFilters: AnnotationSchemaItem[];
  selectedFilterKey?: string;
  selectedFilterValue?: string;
  onSelectedFilterKeyChanged: (selectedFilterKey: string) => void;
  onSelectedFilterValueChanged: (selectedFilterValue: string) => void;
  onAddFilterClicked: () => void;
}) {
  return (
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
              <SelectItem value={"false"}>false</SelectItem>
              <SelectItem value={"true"}>true</SelectItem>
            </>
          )}
        </SelectContent>
      </Select>
      <Button onClick={onAddFilterClicked}>Add filter</Button>
    </div>
  );
}
