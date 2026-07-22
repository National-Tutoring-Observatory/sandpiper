import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import addDialog from "~/modules/dialogs/addDialog";
import type { CodebookCode, CodebookExample } from "../codebooks.types";
import {
  EXAMPLE_TYPES,
  createEmptyExample,
} from "../helpers/codebookEditorHelpers";
import DeleteExampleDialog from "./deleteExampleDialog";

export default function CodebookCodeEditor({
  code,
  disabled,
  onChange,
}: {
  code: CodebookCode;
  disabled: boolean;
  onChange: (code: CodebookCode) => void;
}) {
  const addExample = () => {
    onChange({ ...code, examples: [...code.examples, createEmptyExample()] });
  };

  const removeExample = (exampleId: string) => {
    onChange({
      ...code,
      examples: code.examples.filter((ex) => ex._id !== exampleId),
    });
  };

  const openDeleteExampleDialog = (exampleId: string) => {
    addDialog(
      <DeleteExampleDialog onDeleteClicked={() => removeExample(exampleId)} />,
    );
  };

  const updateExample = (
    exampleId: string,
    field: keyof CodebookExample,
    value: string,
  ) => {
    onChange({
      ...code,
      examples: code.examples.map((ex) =>
        ex._id === exampleId ? { ...ex, [field]: value } : ex,
      ),
    });
  };

  return (
    <div className="grid gap-4 overflow-y-auto p-4">
      <div className="grid gap-3">
        <Label htmlFor={`code-${code._id}`}>Code</Label>
        <Input
          id={`code-${code._id}`}
          value={code.code}
          disabled={disabled}
          autoComplete="off"
          onChange={(e) => onChange({ ...code, code: e.target.value })}
        />
      </div>
      <div className="grid gap-3">
        <Label htmlFor={`definition-${code._id}`}>Description</Label>
        <p className="text-muted-foreground text-body">
          A basic description that is not used when generating a prompt. This
          should be used as a brief overview.
        </p>
        <Textarea
          id={`definition-${code._id}`}
          value={code.description}
          disabled={disabled}
          onChange={(e) => onChange({ ...code, description: e.target.value })}
        />
      </div>
      <div className="grid gap-3">
        <Label htmlFor={`definition-${code._id}`}>Definition</Label>
        <Textarea
          id={`definition-${code._id}`}
          value={code.definition}
          disabled={disabled}
          onChange={(e) => onChange({ ...code, definition: e.target.value })}
        />
      </div>
      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <Label>Examples</Label>
          {!disabled && (
            <Button size="sm" variant="outline" onClick={addExample}>
              <Plus className="mr-1 h-3 w-3" />
              Add example
            </Button>
          )}
        </div>
        {code.examples.length === 0 ? (
          <p className="text-muted-foreground text-body">No examples yet.</p>
        ) : (
          <div className="grid gap-3">
            {code.examples.map((example) => (
              <div
                key={example._id}
                className="flex items-start gap-3 rounded-md border p-3"
              >
                <div className="grid flex-1 gap-2">
                  <Input
                    autoFocus
                    placeholder="Example text"
                    value={example.example}
                    disabled={disabled}
                    autoComplete="off"
                    onChange={(e) =>
                      updateExample(example._id, "example", e.target.value)
                    }
                  />
                  <Select
                    value={example.exampleType}
                    disabled={disabled}
                    onValueChange={(value) =>
                      updateExample(example._id, "exampleType", value)
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXAMPLE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!disabled && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive shrink-0"
                    onClick={() => openDeleteExampleDialog(example._id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
