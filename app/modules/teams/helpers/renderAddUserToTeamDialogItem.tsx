import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { User } from "~/modules/users/users.types";
import type { TeamRole } from "../teams.types";
import getRoles from "./getRoles";

export default function renderAddUserToTeamDialogItem(
  user: User,
  selectedUsers: Record<string, TeamRole>,
  onRoleChanged: (userId: string, role: TeamRole) => void,
) {
  const role = selectedUsers[user._id];
  const isChecked = role !== undefined;

  const roles = getRoles();

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
      {isChecked && (
        // Stop propagation at capture phase so the role select doesn't
        // also trigger the parent item's toggle (which uses bubbling).
        <div className="ml-4" onClickCapture={(e) => e.stopPropagation()}>
          <Select
            value={role}
            onValueChange={(value) =>
              onRoleChanged(user._id, value as TeamRole)
            }
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roles.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
