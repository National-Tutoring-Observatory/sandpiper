import map from "lodash/map";
import { ChevronDown } from "lucide-react";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import type { SelectAction, SelectProps } from "./selectAll";

const SelectActions = ({
  selectActionsValues = {},
  actions,
  onSelectActionChanged,
}: {
  actions: SelectAction[];
} & Pick<SelectProps, "selectActionsValues" | "onSelectActionChanged">) => {
  return (
    <div>
      {map(actions, (action) => {
        const Component = action.component;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                {action.text}
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-fit">
              <Component
                value={selectActionsValues[action.action] || []}
                onChange={(value) =>
                  onSelectActionChanged?.({ action: action.action, value })
                }
              />
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}
    </div>
  );
};

export default SelectActions;
