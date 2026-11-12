import { Badge } from "@/components/ui/badge";
import map from "lodash/map";
import type { Tag } from "../tags.types";

const SelectedTags = ({ tags }: { tags: Tag[] }) => {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {map(tags, (tag) => (
        <Badge
          key={tag._id}
          variant="outline"
          style={{
            color: tag.color,
            borderColor: tag.color,
            backgroundColor: `${tag.color}33`,
          }}
        >
          {tag.name}
        </Badge>
      ))}
    </div>
  );
};

export default SelectedTags;
