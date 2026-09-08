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
              {value
                ? filter.options.find((option) => option.value === value)?.text
                : "--"}
              <ChevronDown className="opacity-30" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0">
            <Command>
              <CommandInput placeholder={`Search...`} className="h-9" />
              <CommandList>
                <CommandEmpty>No framework found.</CommandEmpty>
                <CommandGroup>
                  {map(filter.options, (option) => {
                    return (
                      <CommandItem
                        key={option.value}
                        value={option.value}
                        keywords={[option.text]}
                        onSelect={(filterValue) => {
                          if (!filter.isMultiSelect) {
                            setIsOpen(false);
                          }
                          if (onFiltersValueChanged) {
                            onFiltersValueChanged({
                              [filter.category]: filterValue,
                            });
                          }
                        }}
                      >
                        {option.text}
                        <Check
                          className={cn(
                            "ml-auto",
                            value === option.value
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
