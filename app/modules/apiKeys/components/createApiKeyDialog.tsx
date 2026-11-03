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
import dayjs from "dayjs";
import { useRef, useState } from "react";
import getDateString from "~/modules/app/helpers/getDateString";
import {
  TOKEN_EXPIRATION_DAYS,
  type TokenExpirationDays,
} from "~/modules/tokens/tokens.types";
import apiKeyExpirationOptions from "../helpers/apiKeyExpirationOptions";
import ApiKeyNameAlert from "./apiKeyNameAlert";

const CreateApiKeyDialog = ({
  onCreateApiKeyClicked,
}: {
  onCreateApiKeyClicked: (
    name: string,
    expiresInDays: TokenExpirationDays,
  ) => void;
}) => {
  const [name, setName] = useState("");
  const [expiresInDays, setExpiresInDays] = useState<TokenExpirationDays>(30);
  const inputRef = useRef<HTMLInputElement>(null);

  const onApiKeyNameChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const onExpirationChanged = (value: string) => {
    const days = TOKEN_EXPIRATION_DAYS.find((d) => String(d) === value);
    if (days) setExpiresInDays(days);
  };

  const expiresAt = dayjs().add(expiresInDays, "day").toDate();

  const isSubmitButtonDisabled = name.trim().length < 3;

  return (
    <DialogContent
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        inputRef.current?.focus();
      }}
    >
      <DialogHeader>
        <DialogTitle>Create a new API key</DialogTitle>
        <DialogDescription>
          Give your API key a name so you can recognise it later.
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
      <div className="grid gap-3">
        <Label htmlFor="api-key-expiration">Expiration</Label>
        <Select
          value={String(expiresInDays)}
          onValueChange={onExpirationChanged}
        >
          <SelectTrigger id="api-key-expiration" className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {apiKeyExpirationOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.text}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-caption text-muted-foreground">
          This key will expire on {getDateString(expiresAt)}.
        </p>
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
          onClick={() => onCreateApiKeyClicked(name.trim(), expiresInDays)}
        >
          Create API key
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

export default CreateApiKeyDialog;
