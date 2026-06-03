import type { CollectionItemAction } from "@/components/ui/collectionItemActions";
import { Edit, Trash2 } from "lucide-react";
import ProjectAuthorization from "~/modules/projects/authorization";
import type { Project } from "~/modules/projects/projects.types";
import type { User } from "~/modules/users/users.types";

export default function getTeamProjectsItemActions(
  item: Project,
  user: User | null,
): CollectionItemAction[] {
  const canUpdate = ProjectAuthorization.canUpdate(user, item);
  const canDelete = ProjectAuthorization.canDelete(user, item);

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
