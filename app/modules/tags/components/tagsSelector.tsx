import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import find from "lodash/find";
import map from "lodash/map";
import { LoaderPinwheel, Plus, X } from "lucide-react";
import type { Tag } from "../tags.types";

const TagsSelector = ({
  tags,
  selectedTags,
  isLoading,
  onChange,
}: {
  tags: Tag[] | undefined;
  selectedTags: string[];
  isLoading: boolean;
  onChange: (tagId: string) => void;
}) => {
  return (
    <div className="flex items-center items-stretch justify-between gap-2 rounded-lg border">
      <div className="flex flex-wrap items-center gap-x-1 px-1">
        {map(selectedTags, (tag) => {
          const selectedTag = find(tags, { _id: tag });
          if (!selectedTag) return null;
          return (
            <Badge key={selectedTag._id} variant="secondary">
              {selectedTag.name}
              <button
                type="button"
                aria-label={`Remove ${selectedTag.name}`}
                onClick={() => onChange(selectedTag._id)}
              >
                <X size={12} />
              </button>
            </Badge>
          );
        })}
      </div>
      <div className="flex items-center">
        <Separator orientation="vertical" className="h-8" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="rounded-l-none">
              <Plus />
              Add tags
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {isLoading && (
              <div className="flex justify-center p-2">
                <LoaderPinwheel size={16} className="animate-spin" />
              </div>
            )}
            {map(tags, (tag) => {
              return (
                <DropdownMenuCheckboxItem
                  key={tag._id}
                  checked={selectedTags.includes(tag._id)}
                  onCheckedChange={() => onChange(tag._id)}
                  onSelect={(event) => event.preventDefault()}
                >
                  {tag.name}
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default TagsSelector;
