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
import type { Tag } from "../tags.types";

const DeleteTagDialog = ({
  tag,
  onDeleteTagClicked,
}: {
  tag: Tag;
  onDeleteTagClicked: () => void;
}) => {
  const [tagName, setTagName] = useState("");

  let isDeleteButtonDisabled = true;

  if (tagName === tag.name) {
    isDeleteButtonDisabled = false;
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Delete tag - {tag.name}</DialogTitle>
        <DialogDescription>THIS ACTION IS IRREVERSIBLE.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-3">
        <Label htmlFor="name-1">To confirm delete, type in the tag name.</Label>
        <div className="relative">
          <Input
            className="absolute top-0 left-0"
            placeholder={tag.name}
            disabled={true}
            autoComplete="off"
          />
          <Input
            className="focus-visible:border-destructive focus-visible:ring-destructive/50"
            id="name-1"
            name="name"
            value={tagName}
            autoComplete="off"
            onChange={(event) => setTagName(event.target.value)}
          />
        </div>
      </div>
      <DialogFooter className="justify-end">
        <DialogClose asChild>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setTagName("");
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
              onDeleteTagClicked();
              setTagName("");
            }}
          >
            Delete tag
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
};

export default DeleteTagDialog;
