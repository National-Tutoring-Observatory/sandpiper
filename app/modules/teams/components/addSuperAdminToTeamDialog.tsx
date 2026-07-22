import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { TeamAssignmentOption } from "../teams.types";
import { TEAM_ASSIGNMENT_OPTIONS } from "../teams.types";

const OPTION_LABELS: Record<TeamAssignmentOption, string> = {
  temporary: "I need temporary access for debugging purposes",
  permanent: "I am a member of this team and need regular access",
};

export default function AddSuperAdminToTeamDialog({
  isSubmitButtonDisabled,
  onAddSuperAdminClicked,
  reason,
  option,
  onReasonChanged,
  onOptionChanged,
}: {
  isSubmitButtonDisabled: boolean;
  onAddSuperAdminClicked: () => void;
  reason: string;
  option: TeamAssignmentOption;
  onReasonChanged: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onOptionChanged: (value: TeamAssignmentOption) => void;
}) {
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add Super Admin to Team </DialogTitle>
        <DialogDescription>
          Select a user to add as a Super Admin to this team.
        </DialogDescription>
      </DialogHeader>
      <div>
        <div>
          <Label className="text-caption mb-2">Reason</Label>
          <Textarea id="reason" value={reason} onChange={onReasonChanged} />
        </div>
        <div className="mt-3">
          <Label className="text-caption mb-2">Assignment type</Label>
          <RadioGroup defaultValue={option} onValueChange={onOptionChanged}>
            {TEAM_ASSIGNMENT_OPTIONS.map((opt) => (
              <div key={opt} className="flex items-center space-x-2">
                <RadioGroupItem value={opt} id={opt} />
                <Label htmlFor={opt}>{OPTION_LABELS[opt]}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline"> Cancel </Button>
        </DialogClose>
        <DialogClose asChild>
          <Button
            disabled={isSubmitButtonDisabled}
            onClick={onAddSuperAdminClicked}
          >
            Add Super Admin
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
}
