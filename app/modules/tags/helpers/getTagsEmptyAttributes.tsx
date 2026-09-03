import { Tag as TagIcon } from "lucide-react";

export default function getTagsEmptyAttributes() {
  return {
    icon: <TagIcon />,
    title: "No tags yet",
    description:
      "You haven't created any tags yet. Get started by creating your first tag.",
    actions: [
      {
        action: "CREATE",
        text: "Create tag",
      },
    ],
  };
}
