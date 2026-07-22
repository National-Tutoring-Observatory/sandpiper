import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { X } from "lucide-react";
import { useRef, useState } from "react";
import type { AvailableAnnotationField } from "../helpers/getAnnotationFieldsFromRuns";
import type { AnnotationTemplateConfig } from "../humanAnnotations.types";

interface Props {
  availableFields: AvailableAnnotationField[];
  onDownloadClicked: (config: AnnotationTemplateConfig) => void;
}

export default function DownloadAnnotationTemplateDialog({
  availableFields,
  onDownloadClicked,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [annotators, setAnnotators] = useState<string[]>([]);
  const [newAnnotator, setNewAnnotator] = useState("");
  const [selectedFields, setSelectedFields] = useState<Map<string, number>>(
    new Map(),
  );

  const addAnnotator = () => {
    const name = newAnnotator.trim();
    if (!name || annotators.includes(name)) return;
    setAnnotators([...annotators, name]);
    setNewAnnotator("");
    inputRef.current?.focus();
  };

  const removeAnnotator = (name: string) => {
    setAnnotators(annotators.filter((a) => a !== name));
  };

  const toggleField = (fieldKey: string) => {
    const next = new Map(selectedFields);
    if (next.has(fieldKey)) {
      next.delete(fieldKey);
    } else {
      next.set(fieldKey, 1);
    }
    setSelectedFields(next);
  };

  const updateSlots = (fieldKey: string, slots: number) => {
    const next = new Map(selectedFields);
    next.set(fieldKey, Math.max(1, slots));
    setSelectedFields(next);
  };

  const isValid = annotators.length > 0 && selectedFields.size > 0;

  const handleDownload = () => {
    const config: AnnotationTemplateConfig = {
      annotators,
      fields: Array.from(selectedFields.entries()).map(([fieldKey, slots]) => ({
        fieldKey,
        slots,
      })),
    };
    onDownloadClicked(config);
  };

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Download Annotation Template</DialogTitle>
        <DialogDescription>
          Configure the template CSV that annotators will fill out. The
          downloaded file will contain session data with empty annotation
          columns.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label>Annotators</Label>
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder="Annotator name"
              value={newAnnotator}
              onChange={(e) => setNewAnnotator(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addAnnotator();
                }
              }}
            />
            <Button
              variant="secondary"
              onClick={addAnnotator}
              disabled={!newAnnotator.trim()}
            >
              Add
            </Button>
          </div>
          {annotators.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {annotators.map((name) => (
                <Badge key={name} variant="secondary" className="gap-1 pr-1">
                  {name}
                  <button
                    onClick={() => removeAnnotator(name)}
                    className="hover:bg-muted rounded-sm p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Annotation fields</Label>
          <p className="text-muted-foreground text-body">
            Select which fields to include. Use multiple columns when an
            utterance may have more than one annotation (e.g. multiple tutor
            moves).
          </p>
          {availableFields.length === 0 ? (
            <p className="text-muted-foreground text-body italic">
              No annotation fields found. Run at least one annotation to
              populate available fields.
            </p>
          ) : (
            <div className="space-y-2">
              {availableFields.map((field) => {
                const isSelected = selectedFields.has(field.fieldKey);
                const slots = selectedFields.get(field.fieldKey) ?? 1;
                return (
                  <div
                    key={field.fieldKey}
                    className="hover:bg-accent text-body flex h-11 items-center gap-3 rounded-md border px-3 py-2"
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleField(field.fieldKey)}
                    />
                    <span
                      className="flex-1 cursor-pointer font-medium"
                      onClick={() => toggleField(field.fieldKey)}
                    >
                      {field.fieldKey}
                    </span>
                    <Badge variant="outline">
                      {field.runCount} run{field.runCount !== 1 ? "s" : ""}
                    </Badge>
                    {isSelected && (
                      <div className="flex items-center gap-1">
                        <Label className="text-muted-foreground text-caption">
                          Columns:
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          value={slots}
                          onChange={(e) =>
                            updateSlots(
                              field.fieldKey,
                              parseInt(e.target.value, 10) || 1,
                            )
                          }
                          className="h-7 w-16"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <DialogFooter>
        <DialogClose asChild>
          <Button variant="secondary">Cancel</Button>
        </DialogClose>
        <Button disabled={!isValid} onClick={handleDownload}>
          Download Template
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
