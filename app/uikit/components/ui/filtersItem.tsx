import { cn } from "@/lib/utils";
import map from "lodash/map";
import { Check, ChevronDown, CircleX } from "lucide-react";
import { useState } from "react";
import { Button } from "./button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command";
import type { Filter, FilterValue, FiltersValues } from "./filters";
import { Label } from "./label";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

const FiltersItem = ({
  filter,
  value,
  onFiltersValueChanged,
}: {
  filter: Filter;
  value: FilterValue | undefined;
  onFiltersValueChanged?: (filterKeyAndValue: FiltersValues) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (filter.options.length > 4 || filter.isMultiSelect) {
    if (filter.isMultiSelect && !Array.isArray(value)) {
      console.warn(
        `FiltersItem: multiSelect filter "${filter.category}" expected an array value but received "${value}".`,
      );
      return null;
    }

    // Non-multiSelect combobox keeps a single string; normalise both shapes
    // to an array for selection/membership rendering below.
    const selectedValues = Array.isArray(value) ? value : value ? [value] : [];

    return (
      <div className="flex flex-col gap-2">
        <div className="flex h-4 items-baseline justify-between">
          <Label htmlFor="width">{filter.text}</Label>
          {value && (
            <Button
              variant="link"
              size={"sm"}
              className="h-auto p-0 text-[10px]"
              onClick={() => {
                if (onFiltersValueChanged) {
                  onFiltersValueChanged({ [filter.category]: null });
                }
              }}
            >
              Clear
              <CircleX className="size-3" />
            </Button>
          )}
        </div>
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={isOpen}
              className="justify-between font-normal"
            >
              {(() => {
                if (selectedValues.length === 0) return "--";
                if (filter.isMultiSelect) {
                  return `${selectedValues.length} selected`;
                }
                return (
                  filter.options.find(
                    (option) => option.value === selectedValues[0],
                  )?.text ?? selectedValues[0]
                );
              })()}
              <ChevronDown className="opacity-30" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0">
            <Command>
              <CommandInput placeholder={`Search...`} className="h-9" />
              <CommandList>
                <CommandEmpty>No item found.</CommandEmpty>
                <CommandGroup>
                  {map(filter.options, (option) => {
                    return (
                      <CommandItem
                        key={option.value}
                        value={option.value}
                        keywords={[option.text]}
                        onSelect={() => {
                          if (!onFiltersValueChanged) return;

                          if (!filter.isMultiSelect) {
                            setIsOpen(false);
                            onFiltersValueChanged({
                              [filter.category]: option.value,
                            });
                            return;
                          }

                          const nextValues = selectedValues.includes(
                            option.value,
                          )
                            ? selectedValues.filter((v) => v !== option.value)
                            : [...selectedValues, option.value];

                          onFiltersValueChanged({
                            [filter.category]:
                              nextValues.length > 0 ? nextValues : null,
                          });
                        }}
                      >
                        {option.text}
                        <Check
                          className={cn(
                            "ml-auto",
                            selectedValues.includes(option.value)
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    );
  } else {
    if (Array.isArray(value)) {
      console.warn(
        `FiltersItem: filter "${filter.category}" received an array value but is not multiSelect. Falling back to no selection.`,
      );
      return null;
    }
    return (
      <div className="flex flex-col gap-2">
        <div className="flex h-4 items-baseline justify-between">
          <Label htmlFor="width">{filter.text}</Label>
          {value && (
            <Button
              variant="link"
              size={"sm"}
              className="h-auto p-0 text-[10px]"
              onClick={() => {
                if (onFiltersValueChanged) {
                  onFiltersValueChanged({ [filter.category]: null });
                }
              }}
            >
              Clear
              <CircleX className="size-3" />
            </Button>
          )}
        </div>
        <div className="relative">
          <Select
            value={value}
            onValueChange={(filterValue) => {
              if (onFiltersValueChanged) {
                onFiltersValueChanged({ [filter.category]: filterValue });
              }
            }}
          >
            <SelectTrigger className="w-full">
              {value ? (
                (filter.options.find((o) => o.value === value)?.text ?? "--")
              ) : (
                <SelectValue placeholder="--" />
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {map(filter.options, (option) => {
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      {option.text}
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            </SelectContent>
          </Select>
          <div className="absolute right-0 flex justify-end"></div>
        </div>
      </div>
    );
  }
};

export default FiltersItem;
