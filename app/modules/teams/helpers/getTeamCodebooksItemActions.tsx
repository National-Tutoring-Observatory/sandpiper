import type { CollectionItemAction } from "@/components/ui/collectionItemActions";
import { Edit, Trash2 } from "lucide-react";
import CodebookAuthorization from "~/modules/codebooks/authorization";
import type { Codebook } from "~/modules/codebooks/codebooks.types";
import type { User } from "~/modules/users/users.types";

export default function getTeamCodebooksItemActions(
  item: Codebook,
  user: User | null,
): CollectionItemAction[] {
  const canUpdate = CodebookAuthorization.canUpdate(user, item);
  const canDelete = CodebookAuthorization.canDelete(user, item);

  const actions: CollectionItemAction[] = [];

  if (canUpdate) {
    actions.push({
      action: "EDIT",
      icon: <Edit />,
      text: "Edit",
    });
  }

  if (canDelete) {
    actions.push({
      action: "DELETE",
      icon: <Trash2 />,
      text: "Delete",
      variant: "destructive",
    });
  }

  return actions;
}
