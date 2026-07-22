import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { AnnotationSchemaFieldCount } from "../helpers/getAnnotationSchemaFieldCounts";

export default function EvaluationCreateAnnotationSchemaDisplay({
  fieldCounts,
  selectedAnnotationFields,
  onAnnotationFieldToggled,
}: {
  fieldCounts: AnnotationSchemaFieldCount[];
  selectedAnnotationFields: string[];
  onAnnotationFieldToggled: (fieldKey: string) => void;
}) {
  if (fieldCounts.length === 0) return null;

  return (
    <div className="mt-4 max-w-lg space-y-2">
      <Label>Annotation schema fields</Label>
      <p className="text-muted-foreground text-body">
        Select the annotation fields to include in this evaluation. At least one
        field must be selected.
      </p>
      <div className="flex flex-wrap gap-2">
        {fieldCounts.map((field) => (
          <div
            key={field.fieldKey}
            className="hover:bg-accent text-body flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2"
            onClick={() => onAnnotationFieldToggled(field.fieldKey)}
          >
            <Checkbox
              id={`field-${field.fieldKey}`}
              checked={selectedAnnotationFields.includes(field.fieldKey)}
              onCheckedChange={() => onAnnotationFieldToggled(field.fieldKey)}
              onClick={(e) => e.stopPropagation()}
            />
            <span className="font-medium">{field.fieldKey}</span>
            <Badge variant="secondary">{field.fieldType}</Badge>
            <span className="text-muted-foreground">
              {field.matchCount}/{field.total} runs
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
