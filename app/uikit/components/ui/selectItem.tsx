import { Checkbox } from "./checkbox";

const SelectItem = ({
  isSelected,
  onSelectItemChanged,
}: {
  isSelected: boolean;
  onSelectItemChanged: () => void;
}) => {
  return (
    <div className="mx-2">
      <Checkbox checked={isSelected} onCheckedChange={onSelectItemChanged} />
    </div>
  );
};

export default SelectItem;
