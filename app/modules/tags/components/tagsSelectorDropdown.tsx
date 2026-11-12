import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import TagsSelectorContainer from "../containers/tagsSelector.container";
import type { TagsSelectorDropdownProps } from "../tags.types";

const TagsSelectorDropdown = ({
  label,
  value,
  onChange,
  onClose,
}: TagsSelectorDropdownProps) => {
  return (
    <div>
      <DropdownMenu
        onOpenChange={(open) => {
          if (!open) onClose?.();
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            {label}
            <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-fit">
          <TagsSelectorContainer value={value} onChange={onChange} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default TagsSelectorDropdown;
