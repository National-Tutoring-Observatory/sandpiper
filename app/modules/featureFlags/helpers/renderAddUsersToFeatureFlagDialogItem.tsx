import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import includes from "lodash/includes";
import type { User } from "~/modules/users/users.types";

export default function renderAddUsersToFeatureFlagDialogItem(
  user: User,
  selectedUsers: string[],
) {
  const isChecked = !!includes(selectedUsers, user._id);
  return (
    <div className="flex items-center gap-3 p-3">
      <Checkbox id={`user-${user._id}`} checked={isChecked} />
      <div className="flex-1 cursor-pointer">
        <Label htmlFor={`user-${user._id}`} className="cursor-pointer">
          {user.name || user.username}
        </Label>
        <p className="text-muted-foreground text-caption pt-1">
          {user.email} · {user.username}
        </p>
      </div>
    </div>
  );
}
