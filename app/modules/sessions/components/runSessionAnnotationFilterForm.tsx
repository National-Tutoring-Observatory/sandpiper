import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import find from "lodash/find";
import map from "lodash/map";
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
  selectedFilterValue?: string | number;
  onSelectedFilterKeyChanged: (selectedFilterKey: string) => void;
  onSelectedFilterValueChanged: (selectedFilterValue: string | number) => void;
  onAddFilterClicked: () => void;
}) {
  const selectedFilter = find(availableFilters, {
    fieldKey: selectedFilterKey,
  });
  return (
    <div className="flex justify-between gap-2">
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
        {(selectedFilter?.fieldType === "boolean" ||
          (selectedFilter?.fieldType === "string" &&
            (selectedFilter.codes?.length ?? 0) > 0)) && (
          <Select
            value={selectedFilterValue?.toString()}
            onValueChange={onSelectedFilterValueChanged}
            disabled={!selectedFilterKey}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select a value" />
            </SelectTrigger>
            <SelectContent>
              {selectedFilter?.fieldType === "boolean" && (
                <>
                  <SelectItem value={"false"}>false</SelectItem>
                  <SelectItem value={"true"}>true</SelectItem>
                </>
              )}
              {selectedFilter?.fieldType === "string" &&
                (selectedFilter.codes?.length ?? 0) > 0 &&
                map(selectedFilter.codes, (code: string) => {
                  return (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  );
                })}
            </SelectContent>
          </Select>
        )}
        {selectedFilter?.fieldType === "string" &&
          (selectedFilter.codes?.length ?? 0) === 0 && (
            <Input
              type="text"
              value={selectedFilterValue}
              onChange={(event) =>
                onSelectedFilterValueChanged(event.target.value)
              }
            />
          )}
        {selectedFilter?.fieldType === "number" && (
          <Input
            type="number"
            value={selectedFilterValue}
            onChange={(event) =>
              onSelectedFilterValueChanged(parseFloat(event.target.value))
            }
          />
        )}
      </div>
      <Button onClick={onAddFilterClicked}>Add filter</Button>
    </div>
  );
}
