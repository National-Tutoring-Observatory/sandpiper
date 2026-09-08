import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import map from "lodash/map";
import { LoaderPinwheel } from "lucide-react";
import type { Tag } from "../tags.types";

const TagsCollectionSelector = ({
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
    <div className="grid gap-y-2">
      {isLoading && (
        <div className="flex justify-center">
          <LoaderPinwheel size={16} className="animate-spin" />
        </div>
      )}
      {map(tags, (tag) => {
        return (
          <div key={tag._id} className="flex items-center gap-x-2 px-0.5 py-1">
            <Checkbox
              id={`tag-${tag._id}`}
              checked={selectedTagIds.includes(tag._id)}
              onCheckedChange={() => toggleTag(tag._id)}
            />
            <Label htmlFor={`tag-${tag._id}`}>{tag.name}</Label>
          </div>
        );
      })}
    </div>
  );
};

export default TagsCollectionSelector;
