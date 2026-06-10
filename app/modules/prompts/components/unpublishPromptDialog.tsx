import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Prompt } from "../prompts.types";

interface UnpublishPromptDialogProps {
  prompt: Prompt;
  onUnpublishPromptClicked: () => void;
  isSubmitting?: boolean;
}

const UnpublishPromptDialog = ({
  prompt,
  onUnpublishPromptClicked,
  isSubmitting = false,
}: UnpublishPromptDialogProps) => {
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Unpublish from library - {prompt.name}</DialogTitle>
        <DialogDescription>
          The prompt will be removed from the library immediately. Existing
          copies in other teams are not affected.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="justify-end">
        <DialogClose asChild>
          <Button type="button" variant="secondary">
            Cancel
          </Button>
        </DialogClose>
        <DialogClose asChild>
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={onUnpublishPromptClicked}
          >
            Unpublish
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
};

export default UnpublishPromptDialog;
