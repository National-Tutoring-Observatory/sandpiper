import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import map from "lodash/map";
import { LoaderPinwheel } from "lucide-react";
import type { Tag } from "../tags.types";

const TagsSelector = ({
  label,
  tags,
  isLoading,
  selectedTagIds,
  toggleTag,
}: {
  label: string;
  tags: Tag[] | undefined;
  isLoading: boolean;
  selectedTagIds: string[];
  toggleTag: (tagId: string) => void;
}) => {
  return (
    <div>
      {isLoading && (
        <div className="flex justify-center">
          <LoaderPinwheel size={16} className="animate-spin" />
        </div>
      )}
      <div className="border-b-accent mb-1 border-b p-1 text-xs">{label}</div>
      {map(tags, (tag) => {
        return (
          <DropdownMenuItem
            key={tag._id}
            onSelect={(event) => {
              event.preventDefault();
              toggleTag(tag._id);
            }}
          >
            <Checkbox
              checked={selectedTagIds.includes(tag._id)}
              className="[&_svg]:text-primary-foreground! pointer-events-none"
            />
            {tag.name}
          </DropdownMenuItem>
        );
      })}
    </div>
  );
};

export default TagsSelector;
