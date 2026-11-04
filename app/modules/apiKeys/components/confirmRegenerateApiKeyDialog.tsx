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

export default function ConfirmRegenerateApiKeyDialog({
  apiKeyName,
  onConfirm,
}: Props) {
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Regenerate this API key?</DialogTitle>
        <DialogDescription>
          The current key for "{apiKeyName}" will stop working immediately.
          Anything using it will need the new key.
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
            Regenerate
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
}
