import { type ReactElement } from "react";
import { Checkbox } from "./checkbox";

export type SelectAction = {
  action: string;
  component: ReactElement;
};

export type SelectProps = {
  selectActions?: SelectAction[];
  selectedItems?: string[];
  totalItems?: number;
  onSelectChanged?: (selectedItems: string[]) => void;
  onSelectAllChanged?: () => void;
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
