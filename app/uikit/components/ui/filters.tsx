import map from "lodash/map";
import { FilterIcon } from "lucide-react";
import type { ReactElement } from "react";
import { Badge } from "./badge";
import { Button } from "./button";
import FiltersItem from "./filtersItem";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export type Filter = {
  icon?: ReactElement;
  category: string;
  text: string;
  isMultiSelect?: boolean;
  options: FilterOption[];
};

export type FilterOption = {
  value: string;
  text: string;
};

/** A single filter's selected value: one option or several options. */
export type FilterValue = string | string[];

/** Map of filter category → selected value (null when cleared). */
export type FiltersValues = Record<string, FilterValue | null>;

export type FiltersProps = {
  filters: Filter[];
  filtersValues: FiltersValues;
  onFiltersValueChanged?: (filtersValue: FiltersValues) => void;
};

const Filters = ({
  filters,
  filtersValues = {},
  onFiltersValueChanged,
}: FiltersProps) => {
  const hasAtLeastOneFilter = Object.values(filtersValues).some((value) =>
    Array.isArray(value)
      ? value.length > 0
      : value !== null && value !== undefined && value !== "",
  );
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <FilterIcon />
          {hasAtLeastOneFilter && (
            <Badge className="bg-sandpiper-accent absolute top-1 right-1 h-1.5 w-1.5 p-0 text-white" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="leading-none font-medium">Filters</h4>
            <p className="text-muted-foreground text-sm">
              Set the filters to apply to your search.
            </p>
          </div>
          <div className="grid gap-8">
            {map(filters, (filter) => {
              return (
                <FiltersItem
                  key={filter.category}
                  filter={filter}
                  value={filtersValues[filter.category] ?? undefined}
                  onFiltersValueChanged={onFiltersValueChanged}
                />
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default Filters;
