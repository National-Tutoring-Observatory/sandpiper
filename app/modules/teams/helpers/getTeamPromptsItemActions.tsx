import type { CollectionItemAction } from "@/components/ui/collectionItemActions";
import { Edit, Trash2 } from "lucide-react";
import PromptAuthorization from "~/modules/prompts/authorization";
import type { Prompt } from "~/modules/prompts/prompts.types";
import type { User } from "~/modules/users/users.types";

export default function getTeamPromptsItemActions(
  item: Prompt,
  user: User | null,
): CollectionItemAction[] {
  const canUpdate = PromptAuthorization.canUpdate(user, item);
  const canDelete = PromptAuthorization.canDelete(user, item);

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
