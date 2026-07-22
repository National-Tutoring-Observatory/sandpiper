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

interface AddCreditsDialogProps {
  onAddCreditsClicked: (amount: number, note: string) => void;
}

const AddCreditsDialog = ({ onAddCreditsClicked }: AddCreditsDialogProps) => {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const numericAmount = parseInt(amount, 10);
  const isValid = !isNaN(numericAmount) && numericAmount >= 1;
  const showMinimumError = amount !== "" && !isValid;

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add credits</DialogTitle>
        <DialogDescription>
          Add credits to this team&apos;s balance. Minimum amount is $1.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-3">
        <Label htmlFor="credit-amount">Amount ($)</Label>
        <Input
          id="credit-amount"
          type="number"
          min="1"
          step="1"
          placeholder="1"
          autoComplete="off"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        {showMinimumError && (
          <p className="text-destructive text-body">Minimum amount is $1.</p>
        )}
        <Label htmlFor="credit-note">Note (optional)</Label>
        <Input
          id="credit-note"
          placeholder="e.g. Monthly top-up"
          autoComplete="off"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
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
            disabled={!isValid}
            onClick={() => onAddCreditsClicked(numericAmount, note)}
          >
            Add credits
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
};

export default AddCreditsDialog;
