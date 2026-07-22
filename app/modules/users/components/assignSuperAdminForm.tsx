import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { User } from "../users.types";

interface AssignSuperAdminFormProps {
  targetUser: User;
  reason: string;
  isSubmitting: boolean;
  isSubmitButtonDisabled: boolean;
  onReasonChanged: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onAssignSuperAdminClicked: (reason: string) => void;
}

export default function AssignSuperAdminForm({
  targetUser,
  reason,
  isSubmitting,
  isSubmitButtonDisabled,
  onReasonChanged,
  onAssignSuperAdminClicked,
}: AssignSuperAdminFormProps) {
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Promote User to Super Admin</DialogTitle>
        <DialogDescription>
          Grant super admin privileges to a user. This action is audited and
          cannot be undone without explicit revocation.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="bg-muted text-body rounded p-3">
          <div>
            <p className="text-muted-foreground text-caption">User:</p>
            <p className="mb-2 font-medium">
              {targetUser.username || "Unknown User"}
            </p>
            <p className="text-muted-foreground text-caption">Current Role:</p>
            <p className="font-medium">{targetUser.role || "USER"}</p>
          </div>
        </div>

        <div>
          <Label htmlFor="reason" className="text-body mb-2 block">
            Reason for Promotion{" "}
            <span className="text-sandpiper-destructive">*</span>
          </Label>
          <Textarea
            id="reason"
            placeholder="Explain why this user is being promoted to super admin..."
            value={reason}
            onChange={onReasonChanged}
            className="min-h-24"
          />
          <p className="text-muted-foreground text-caption mt-1">
            This will be recorded in the audit log for security purposes.
          </p>
        </div>
      </div>

      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button
          disabled={isSubmitButtonDisabled}
          onClick={() => onAssignSuperAdminClicked(reason)}
        >
          {isSubmitting ? "Promoting..." : "Promote to Super Admin"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
