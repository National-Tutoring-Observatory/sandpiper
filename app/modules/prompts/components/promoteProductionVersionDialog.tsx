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

interface PromoteProductionVersionDialogProps {
  prompt: Prompt;
  targetVersion: number;
  onConfirmClicked: () => void;
  isSubmitting?: boolean;
}

const PromoteProductionVersionDialog = ({
  prompt,
  targetVersion,
  onConfirmClicked,
  isSubmitting = false,
}: PromoteProductionVersionDialogProps) => {
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Promote v{targetVersion} to production</DialogTitle>
        <DialogDescription>
          {prompt.library?.isPublished
            ? "This prompt is published to the library. The new production version will appear in the library immediately for all users."
            : "The production version is what runs use by default."}
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
            onClick={onConfirmClicked}
          >
            Make production
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
};

export default PromoteProductionVersionDialog;
