import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import { useState } from "react";

export default function CodesEditor({
  codes,
  disabled,
  onAddCode,
  onRemoveCode,
}: {
  codes: string[];
  disabled: boolean;
  onAddCode: (code: string) => void;
  onRemoveCode: (code: string) => void;
}) {
  const [newCode, setNewCode] = useState("");

  const handleAddCode = () => {
    const trimmed = newCode.trim();
    if (trimmed) {
      onAddCode(trimmed);
      setNewCode("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddCode();
    }
  };

  return (
    <div>
      <Label className="text-caption mb-0.5">Codes</Label>
      {codes.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {codes.map((code) => (
            <Badge key={code} variant="secondary" className="gap-1">
              {code}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onRemoveCode(code)}
                  className="hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
      {!disabled && (
        <div className="flex items-center gap-2">
          <Input
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a code"
            className="w-48"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleAddCode}
            disabled={!newCode.trim()}
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      )}
    </div>
  );
}
