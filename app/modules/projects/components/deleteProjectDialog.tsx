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
import type { Project } from "../projects.types";

const DeleteProjectDialog = ({
  project,
  onDeleteProjectClicked,
  isSubmitting = false,
}: {
  project: Project;
  onDeleteProjectClicked: () => void;
  isSubmitting?: boolean;
}) => {
  const [projectName, setProjectName] = useState("");

  let isDeleteButtonDisabled = true;

  if (projectName === project.name) {
    isDeleteButtonDisabled = false;
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Delete project - {project.name}</DialogTitle>
        <DialogDescription>THIS ACTION IS IRREVERSIBLE.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-3">
        <Label htmlFor="name-1">
          To confirm delete, type in the project name.
        </Label>
        <div className="relative">
          <Input
            className="absolute top-0 left-0"
            placeholder={project.name}
            disabled={true}
            autoComplete="off"
          />
          <Input
            className="focus-visible:border-destructive focus-visible:ring-destructive/50"
            id="name-1"
            name="name"
            value={projectName}
            autoComplete="off"
            onChange={(event) => setProjectName(event.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </div>
      <DialogFooter className="justify-end">
        <DialogClose asChild>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setProjectName("");
            }}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </DialogClose>
        <DialogClose asChild>
          <Button
            type="button"
            disabled={isDeleteButtonDisabled || isSubmitting}
            variant="destructive"
            onClick={() => {
              onDeleteProjectClicked();
              setProjectName("");
            }}
          >
            Delete project
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
};

export default DeleteProjectDialog;
