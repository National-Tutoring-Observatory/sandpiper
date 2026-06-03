import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { AlertCircleIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import getReferenceId from "~/helpers/getReferenceId";
import addDialog from "~/modules/dialogs/addDialog";
import { projectUrl } from "../helpers/projectUrls";
import type { Project } from "../projects.types";
import ProjectNameAlert from "./projectNameAlert";

const EditProjectDialog = ({
  project,
  onProjectUpdated,
}: {
  project: Project;
  onProjectUpdated: () => void;
}) => {
  const [updatedProject, setUpdatedProject] = useState(project);
  const fetcher = useFetcher();

  const isSubmitting = fetcher.state !== "idle";
  const error = fetcher.data?.errors?.general;

  useEffect(() => {
    if (fetcher.state !== "idle") return;
    if (!fetcher.data?.success) return;
    addDialog(null);
    onProjectUpdated();
  }, [fetcher.state, fetcher.data]);

  const onProjectNameChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUpdatedProject({ ...updatedProject, name: event.target.value });
  };

  const onSubmit = () => {
    fetcher.submit(
      JSON.stringify({
        intent: "UPDATE_PROJECT",
        payload: { name: updatedProject.name },
      }),
      {
        method: "PUT",
        encType: "application/json",
        action: projectUrl(getReferenceId(project.team), project._id),
      },
    );
  };

  const isSubmitButtonDisabled =
    isSubmitting || updatedProject?.name.trim().length < 3;

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit project</DialogTitle>
        <DialogDescription></DialogDescription>
      </DialogHeader>
      <div className="grid gap-3">
        <Label htmlFor="name-1">Name</Label>
        <Input
          id="name-1"
          name="name"
          defaultValue={updatedProject.name}
          autoComplete="off"
          onChange={onProjectNameChanged}
          disabled={isSubmitting}
        />
        {error ? (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <ProjectNameAlert name={updatedProject?.name} />
        )}
      </div>
      <DialogFooter className="justify-end">
        <DialogClose asChild>
          <Button type="button" variant="secondary" disabled={isSubmitting}>
            Cancel
          </Button>
        </DialogClose>
        <Button
          type="button"
          disabled={isSubmitButtonDisabled}
          onClick={onSubmit}
        >
          {isSubmitting ? "Saving..." : "Save project"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

export default EditProjectDialog;
