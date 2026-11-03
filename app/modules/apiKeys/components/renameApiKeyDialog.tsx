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
import { useRef, useState } from "react";
import type { ApiKey } from "../apiKeys.types";
import ApiKeyNameAlert from "./apiKeyNameAlert";

const RenameApiKeyDialog = ({
  apiKey,
  onRenameApiKeyClicked,
}: {
  apiKey: ApiKey;
  onRenameApiKeyClicked: (apiKey: ApiKey, name: string) => void;
}) => {
  const [name, setName] = useState(apiKey.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const onApiKeyNameChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const isSubmitButtonDisabled = name.trim().length < 3;

  return (
    <DialogContent
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        inputRef.current?.focus();
      }}
    >
      <DialogHeader>
        <DialogTitle>Rename API key</DialogTitle>
        <DialogDescription>
          Give your API key a new name so you can recognise it later.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-3">
        <Label htmlFor="api-key-name">Name</Label>
        <Input
          id="api-key-name"
          name="name"
          defaultValue={name}
          autoComplete="off"
          ref={inputRef}
          maxLength={100}
          onChange={onApiKeyNameChanged}
        />
        <ApiKeyNameAlert name={name} />
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
          onClick={() => onRenameApiKeyClicked(apiKey, name.trim())}
        >
          Save API key
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

export default RenameApiKeyDialog;
