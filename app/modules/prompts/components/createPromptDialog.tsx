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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { annotationTypeOptions } from "~/modules/annotations/helpers/annotationTypes";
import PromptNameAlert from "./promptNameAlert";

const CreatePromptDialog = ({
  onCreateNewPromptClicked,
  isSubmitting = false,
}: {
  onCreateNewPromptClicked: ({
    name,
    annotationType,
  }: {
    name: string;
    annotationType: string;
  }) => void;
  isSubmitting?: boolean;
}) => {
  const [name, setName] = useState("");
  const [annotationType, setAnnotationType] = useState("PER_UTTERANCE");

  const onPromptNameChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const isSubmitButtonDisabled = name.trim().length < 3 || isSubmitting;

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create a new prompt</DialogTitle>
        <DialogDescription>
          Give your prompt a name. This can be changed at a later date but
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
          onChange={onPromptNameChanged}
        />
        <PromptNameAlert name={name} />
        <Label htmlFor="annotation-type">Annotation type</Label>
        <Select
          value={annotationType}
          onValueChange={(annotationType) => {
            setAnnotationType(annotationType);
          }}
        >
          <SelectTrigger id="annotation-type" className="w-[180px]">
            <SelectValue placeholder="Select an annotation type" />
          </SelectTrigger>
          <SelectContent>
            {annotationTypeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DialogFooter className="justify-end">
        <DialogClose asChild>
          <Button type="button" variant="secondary">
            Cancel
          </Button>
        </DialogClose>
        <Button
          type="button"
          disabled={isSubmitButtonDisabled}
          onClick={() => {
            onCreateNewPromptClicked({ name, annotationType });
          }}
        >
          Create prompt
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

export default CreatePromptDialog;
