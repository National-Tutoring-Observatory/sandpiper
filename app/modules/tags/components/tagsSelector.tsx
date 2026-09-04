import { DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import map from "lodash/map";
import { LoaderPinwheel } from "lucide-react";
import type { Tag } from "../tags.types";

const TagsSelector = ({
  tags,
  isLoading,
  selectedTagIds,
  toggleTag,
}: {
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
      {map(tags, (tag) => {
        return (
          <DropdownMenuCheckboxItem
            key={tag._id}
            checked={selectedTagIds.includes(tag._id)}
            onCheckedChange={() => toggleTag(tag._id)}
            onSelect={(event) => event.preventDefault()}
          >
            {tag.name}
          </DropdownMenuCheckboxItem>
        );
      })}
    </div>
  );
};

export default TagsSelector;
