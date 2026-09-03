import type { CollectionItemAction } from "@/components/ui/collectionItemActions";
import { Edit, Trash2 } from "lucide-react";

export default function useTagsItemActions(): () => CollectionItemAction[] {
  return (_item?: unknown): CollectionItemAction[] => {
    return [
      {
        action: "EDIT",
        icon: <Edit />,
        text: "Edit",
      },
      {
        action: "DELETE",
        icon: <Trash2 />,
        text: "Delete",
        variant: "destructive",
      },
    ];
  };
}
