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
import TeamsSelectorContainer from "~/modules/teams/containers/teamsSelector.container";
import CodebookNameAlert from "./codebookNameAlert";

const CreateCodebookDialog = ({
  hasTeamSelection,
  onCreateNewCodebookClicked,
  isSubmitting = false,
}: {
  hasTeamSelection: boolean;
  onCreateNewCodebookClicked: ({
    name,
    description,
    team,
  }: {
    name: string;
    description: string;
    team: string | null;
  }) => void;
  isSubmitting?: boolean;
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [team, setTeam] = useState<string | null>(null);

  const onNameChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const onDescriptionChanged = (
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setDescription(event.target.value);
  };

  const onTeamSelected = (selectedTeam: string) => {
    setTeam(selectedTeam);
  };

  let isSubmitButtonDisabled = true;
  if (name.trim().length >= 3 && !isSubmitting) {
    if (hasTeamSelection) {
      if (team) {
        isSubmitButtonDisabled = false;
      }
    } else {
      isSubmitButtonDisabled = false;
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create a new codebook</DialogTitle>
        <DialogDescription>
          Give your codebook a name and description. This can be changed at a
          later date.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-3">
        <Label htmlFor="name-1">Name</Label>
        <Input
          id="name-1"
          name="name"
          defaultValue={name}
          autoComplete="off"
          onChange={onNameChanged}
        />
        <CodebookNameAlert name={name} />
        <div>
          <Label htmlFor="description-1">Intention</Label>
          <p className="text-muted-foreground text-sm">
            State what this codebook is trying to achieve.
          </p>
        </div>
        <Textarea
          id="description-1"
          name="description"
          defaultValue={description}
          onChange={onDescriptionChanged}
        />
        {hasTeamSelection && (
          <div className="grid gap-3">
            <Label htmlFor="team-1">Team</Label>
            <TeamsSelectorContainer
              team={team}
              onTeamSelected={onTeamSelected}
            />
          </div>
        )}
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
              onCreateNewCodebookClicked({ name, description, team });
            }}
          >
            Create codebook
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
};

export default CreateCodebookDialog;
