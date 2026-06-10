import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Globe } from "lucide-react";
import { useState } from "react";
import type { Prompt } from "../prompts.types";
import PromptNameAlert from "./promptNameAlert";

const EditPromptDialog = ({
  prompt,
  onEditPromptClicked,
  isSubmitting = false,
}: {
  prompt: Prompt;
  onEditPromptClicked: (prompt: Prompt) => void;
  isSubmitting?: boolean;
}) => {
  const [updatedPrompt, setUpdatedPrompt] = useState(prompt);
  const isPublished = Boolean(prompt.library?.isPublished);

  const onPromptNameChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUpdatedPrompt({ ...updatedPrompt, name: event.target.value });
  };

  let isSubmitButtonDisabled = true;

  if (updatedPrompt?.name.trim().length >= 3 && !isSubmitting) {
    isSubmitButtonDisabled = false;
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit prompt</DialogTitle>
        <DialogDescription></DialogDescription>
      </DialogHeader>
      {isPublished ? (
        <Alert>
          <Globe />
          <AlertTitle>This prompt is published to the library</AlertTitle>
          <AlertDescription>
            Changes will appear in the library immediately for all users.
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-3">
        <Label htmlFor="name-1">Name</Label>
        <Input
          id="name-1"
          name="name"
          defaultValue={updatedPrompt.name}
          autoComplete="off"
          onChange={onPromptNameChanged}
        />
        <PromptNameAlert name={updatedPrompt?.name} />
      </div>
      <DialogFooter className="justify-end">
        <DialogClose asChild>
          <Button type="button" variant="secondary">
            Cancel
          </Button>
        </DialogClose>
        <DialogClose asChild>
          <Button
            type="button"
            disabled={isSubmitButtonDisabled}
            onClick={() => {
              onEditPromptClicked(updatedPrompt);
            }}
          >
            Save prompt
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
};

export default EditPromptDialog;
