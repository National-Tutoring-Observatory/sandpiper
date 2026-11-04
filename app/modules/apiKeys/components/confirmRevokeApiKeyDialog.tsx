import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  apiKeyName: string;
  onConfirm: () => void;
}

export default function ConfirmRevokeApiKeyDialog({
  apiKeyName,
  onConfirm,
}: Props) {
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Revoke this API key?</DialogTitle>
        <DialogDescription>
          "{apiKeyName}" will stop working immediately. This cannot be undone.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="justify-end">
        <DialogClose asChild>
          <Button type="button" variant="secondary">
            Cancel
          </Button>
        </DialogClose>
        <DialogClose asChild>
          <Button type="button" variant="destructive" onClick={onConfirm}>
            Revoke
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
}
