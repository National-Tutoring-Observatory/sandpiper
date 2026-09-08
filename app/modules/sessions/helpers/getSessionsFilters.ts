import type { Tag } from "~/modules/tags/tags.types";

export default function getSessionsFilters(tags: Tag[]) {
  return [
    {
      category: "tags",
      text: "Tags",
      isMultiSelect: true,
      options: tags.map((tag) => ({
        value: tag._id,
        text: tag.name,
      })),
    },
  ];
}
