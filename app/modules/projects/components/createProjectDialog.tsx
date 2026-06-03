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
import addDialog from "~/modules/dialogs/addDialog";
import { projectsUrl } from "../helpers/projectUrls";
import type { Project } from "../projects.types";
import ProjectNameAlert from "./projectNameAlert";

const CreateProjectDialog = ({
  teamId,
  onProjectCreated,
}: {
  teamId: string;
  onProjectCreated: (project: Project) => void;
}) => {
  const [name, setName] = useState("");
  const fetcher = useFetcher();

  const isSubmitting = fetcher.state !== "idle";
  const error = fetcher.data?.errors?.general;

  useEffect(() => {
    if (fetcher.state !== "idle") return;
    if (!fetcher.data?.success) return;
    addDialog(null);
    onProjectCreated(fetcher.data.data);
  }, [fetcher.state, fetcher.data]);

  const onProjectNameChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const onSubmit = () => {
    fetcher.submit(
      JSON.stringify({ intent: "CREATE_PROJECT", payload: { name } }),
      {
        method: "POST",
        encType: "application/json",
        action: projectsUrl(teamId),
      },
    );
  };

  const isSubmitButtonDisabled = name.trim().length < 3;

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create a new project</DialogTitle>
        <DialogDescription>
          Give your project a name. This can be changed at a later date but
          giving a description now will make it easier to find later.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-3">
        <Label htmlFor="name-1">Name</Label>
        <Input
          id="name-1"
          name="name"
          defaultValue={name}
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
          <ProjectNameAlert name={name} />
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
          disabled={isSubmitButtonDisabled || isSubmitting}
          onClick={onSubmit}
        >
          {isSubmitting ? "Creating..." : "Create project"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

export default CreateProjectDialog;
