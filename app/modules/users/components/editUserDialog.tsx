import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import addDialog from "~/modules/dialogs/addDialog";
import { adminUsersUrl } from "../helpers/userUrls";
import type { User } from "../users.types";

const EditUserDialog = ({
  user,
  onUserUpdated,
}: {
  user: User;
  onUserUpdated: () => void;
}) => {
  const [name, setName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");
  const fetcher = useFetcher();

  const isSubmitting = fetcher.state !== "idle";
  const errors = fetcher.data?.errors;

  useEffect(() => {
    if (fetcher.state !== "idle") return;
    if (!fetcher.data?.success) return;
    addDialog(null);
    onUserUpdated();
  }, [fetcher.state, fetcher.data]);

  const onSubmit = () => {
    fetcher.submit(
      JSON.stringify({
        intent: "UPDATE_USER",
        payload: { targetUserId: user._id, name, email },
      }),
      { method: "POST", encType: "application/json", action: adminUsersUrl() },
    );
  };

  const isSubmitButtonDisabled = isSubmitting;

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit user</DialogTitle>
        <DialogDescription></DialogDescription>
      </DialogHeader>
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label>Username</Label>
          <Input value={user.username || ""} disabled />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            defaultValue={name}
            autoComplete="off"
            onChange={(e) => setName(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={email}
            autoComplete="off"
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
          />
          {errors?.email && (
            <p className="text-destructive text-sm">{errors.email}</p>
          )}
        </div>
        {errors?.general && (
          <p className="text-destructive text-sm">{errors.general}</p>
        )}
      </div>
      <DialogFooter className="justify-end">
        <DialogClose asChild>
          <Button type="button" variant="secondary" disabled={isSubmitting}>
            Cancel
          </Button>
        </DialogClose>
        <Button
          type="button"
          disabled={isSubmitButtonDisabled}
          onClick={onSubmit}
        >
          {isSubmitting ? "Saving..." : "Save user"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

export default EditUserDialog;
