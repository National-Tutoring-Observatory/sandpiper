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
import type { Tag } from "../tags.types";

const EditTagDialog = ({
  tag,
  onEditTagClicked,
  isSubmitting = false,
}: {
  tag: Pick<Tag, "name" | "description" | "color">;
  onEditTagClicked: (tag: Pick<Tag, "name" | "description" | "color">) => void;
  isSubmitting?: boolean;
}) => {
  const [updatedTag, setUpdatedTag] = useState(tag);

  const onNameChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUpdatedTag({ ...updatedTag, name: event.target.value });
  };

  const onDescriptionChanged = (
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setUpdatedTag({
      ...updatedTag,
      description: event.target.value,
    });
  };

  const isSubmitButtonDisabled =
    updatedTag.name.trim().length < 3 || isSubmitting;

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit tag</DialogTitle>
        <DialogDescription></DialogDescription>
      </DialogHeader>
      <div className="grid gap-3">
        <Label htmlFor="name-1">Name</Label>
        <Input
          id="name-1"
          name="name"
          defaultValue={updatedTag.name}
          autoComplete="off"
          onChange={onNameChanged}
        />
        <div>
          <Label htmlFor="description-1">Description</Label>
        </div>
        <Textarea
          id="description-1"
          name="description"
          placeholder="State what this tag is trying to achieve."
          defaultValue={updatedTag.description}
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
              onEditTagClicked(updatedTag);
            }}
          >
            Save tag
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
};

export default EditTagDialog;
