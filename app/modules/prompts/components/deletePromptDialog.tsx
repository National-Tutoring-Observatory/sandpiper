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
import { useState } from "react";
import type { Prompt } from "../prompts.types";

const DeletePromptDialog = ({
  prompt,
  onDeletePromptClicked,
  isSubmitting = false,
}: {
  prompt: Prompt;
  onDeletePromptClicked: () => void;
  isSubmitting?: boolean;
}) => {
  const [promptName, setPromptName] = useState("");

  let isDeleteButtonDisabled = true;

  if (promptName === prompt.name && !isSubmitting) {
    isDeleteButtonDisabled = false;
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Delete prompt - {prompt.name}</DialogTitle>
        <DialogDescription>THIS ACTION IS IRREVERSIBLE.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-3">
        <Label htmlFor="name-1">
          To confirm delete, type in the prompt name.
        </Label>
        <div className="relative">
          <Input
            className="absolute top-0 left-0"
            placeholder={prompt.name}
            disabled={true}
            autoComplete="off"
          />
          <Input
            className="focus-visible:border-destructive focus-visible:ring-destructive/50"
            id="name-1"
            name="name"
            value={promptName}
            autoComplete="off"
            onChange={(event) => setPromptName(event.target.value)}
          />
        </div>
      </div>
      <DialogFooter className="justify-end">
        <DialogClose asChild>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setPromptName("");
            }}
          >
            Cancel
          </Button>
        </DialogClose>
        <DialogClose asChild>
          <Button
            type="button"
            disabled={isDeleteButtonDisabled}
            variant="destructive"
            onClick={() => {
              onDeletePromptClicked();
              setPromptName("");
            }}
          >
            Delete prompt
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
};

export default DeletePromptDialog;
