import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Copy, TriangleAlert } from "lucide-react";
import { useState } from "react";

const ApiKeyCreatedDialog = ({
  token,
  onCopyClicked,
}: {
  token: string;
  onCopyClicked: (token: string) => void;
}) => {
  const [hasCopied, setHasCopied] = useState(false);

  const onCopyButtonClicked = () => {
    onCopyClicked(token);
    setHasCopied(true);
  };

  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>Your new API key</DialogTitle>
        <DialogDescription>
          Use this key to authenticate requests to the API.
        </DialogDescription>
      </DialogHeader>
      <Alert variant="destructive">
        <TriangleAlert />
        <AlertTitle>Copy this key now</AlertTitle>
        <AlertDescription>
          This is the only time the full key will be shown. Store it somewhere
          safe. If you lose it, you will need to regenerate it.
        </AlertDescription>
      </Alert>
      <div className="bg-muted flex items-center gap-2 rounded-md border p-2 pl-3">
        <code className="text-body min-w-0 flex-1 font-mono break-all select-all">
          {token}
        </code>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCopyButtonClicked}
        >
          {hasCopied ? <Check /> : <Copy />}
          {hasCopied ? "Copied" : "Copy"}
        </Button>
      </div>
      <DialogFooter className="justify-end">
        <DialogClose asChild>
          <Button type="button">Done</Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
};

export default ApiKeyCreatedDialog;
