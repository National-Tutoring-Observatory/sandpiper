import { type ComponentType, type ReactElement } from "react";
import { Checkbox } from "./checkbox";

export type SelectActionComponentProps = {
  value: string[];
  onChange: (value: string) => void;
};

export type SelectActionChange = {
  action: string;
  value: string;
};

export type SelectActionClose = {
  action: string;
  value: string[];
};

export type SelectAction = {
  action: string;
  text: string;
  icon: ReactElement;
  component: ComponentType<SelectActionComponentProps>;
};

export type SelectProps = {
  selectActions?: SelectAction[];
  selectedItems?: string[];
  selectActionsValues?: Record<string, string[]>;
  totalItems?: number;
  onSelectChanged?: (selectedItems: string[]) => void;
  onSelectAllChanged?: () => void;
  onSelectActionChanged?: (payload: SelectActionChange) => void;
  onSelectActionClosed?: (payload: SelectActionClose) => void;
};

const SelectAll = ({
  selectedItems = [],
  totalItems = 0,
  onSelectAllChanged,
}: SelectProps) => {
  let checkedStatus: boolean | "indeterminate" = false;
  if (selectedItems.length > 0) {
    checkedStatus = "indeterminate";
    if (selectedItems.length === totalItems) {
      checkedStatus = true;
    }
  }
  return (
    <div className="mx-2">
      <Checkbox checked={checkedStatus} onCheckedChange={onSelectAllChanged} />
    </div>
  );
};

export default SelectAll;
