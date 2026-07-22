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
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import type { Codebook } from "../codebooks.types";
import CodebookNameAlert from "./codebookNameAlert";

const EditCodebookDialog = ({
  codebook,
  onEditCodebookClicked,
  isSubmitting = false,
}: {
  codebook: Codebook;
  onEditCodebookClicked: (codebook: Codebook) => void;
  isSubmitting?: boolean;
}) => {
  const [updatedCodebook, setUpdatedCodebook] = useState(codebook);

  const onNameChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUpdatedCodebook({ ...updatedCodebook, name: event.target.value });
  };

  const onDescriptionChanged = (
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setUpdatedCodebook({
      ...updatedCodebook,
      description: event.target.value,
    });
  };

  const isSubmitButtonDisabled =
    updatedCodebook.name.trim().length < 3 || isSubmitting;

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit codebook</DialogTitle>
        <DialogDescription></DialogDescription>
      </DialogHeader>
      <div className="grid gap-3">
        <Label htmlFor="name-1">Name</Label>
        <Input
          id="name-1"
          name="name"
          defaultValue={updatedCodebook.name}
          autoComplete="off"
          onChange={onNameChanged}
        />
        <CodebookNameAlert name={updatedCodebook.name} />
        <div>
          <Label htmlFor="description-1">Intention</Label>
          <p className="text-muted-foreground text-body">
            State what this codebook is trying to achieve.
          </p>
        </div>
        <Textarea
          id="description-1"
          name="description"
          placeholder="State what this codebook is trying to achieve."
          defaultValue={updatedCodebook.description}
          onChange={onDescriptionChanged}
        />
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
              onEditCodebookClicked(updatedCodebook);
            }}
          >
            Save codebook
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
};

export default EditCodebookDialog;
