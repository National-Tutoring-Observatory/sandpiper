import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import cloneDeep from "lodash/cloneDeep";
import map from "lodash/map";
import { Trash } from "lucide-react";
import Flag from "~/modules/featureFlags/components/flag";
import CodesEditor from "./codesEditor";

export default function AnnotationSchemaBuilder({
  annotationSchema,
  hasBeenSaved,
  onAnnotationSchemaChanged,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  annotationSchema: any[];
  hasBeenSaved: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAnnotationSchemaChanged: (annotationSchema: any[]) => void;
}) {
  const onCreateNewSchemaField = () => {
    const annotationSchemaCloned = cloneDeep(annotationSchema);

    annotationSchemaCloned.push({
      isSystem: false,
      fieldType: "string",
      fieldKey: "field",
      value: "",
    });
    onAnnotationSchemaChanged(annotationSchemaCloned);
  };

  const onDeleteAnnotationFieldClicked = (annotationIndex: number) => {
    const annotationSchemaCloned = cloneDeep(annotationSchema);

    annotationSchemaCloned.splice(annotationIndex, 1);

    onAnnotationSchemaChanged(annotationSchemaCloned);
  };

  const onAnnotationFieldChanged = ({
    itemIndex,
    field,
    value,
  }: {
    itemIndex: number;
    field: string;
    value: boolean | string | number;
  }) => {
    const annotationSchemaCloned = cloneDeep(annotationSchema);
    if (field === "fieldType") {
      if (value === "string") {
        annotationSchemaCloned[itemIndex].value = "";
      } else if (value === "number") {
        annotationSchemaCloned[itemIndex].value = 0;
      } else {
        annotationSchemaCloned[itemIndex].value = false;
      }
      if (value !== "string") {
        delete annotationSchemaCloned[itemIndex].codes;
      }
    }
    annotationSchemaCloned[itemIndex][field] = value;
    onAnnotationSchemaChanged(annotationSchemaCloned);
  };

  const onAddCode = (itemIndex: number, code: string) => {
    const annotationSchemaCloned = cloneDeep(annotationSchema);
    const codes = annotationSchemaCloned[itemIndex].codes || [];
    if (!codes.includes(code)) {
      codes.push(code);
    }
    annotationSchemaCloned[itemIndex].codes = codes;
    onAnnotationSchemaChanged(annotationSchemaCloned);
  };

  const onRemoveCode = (itemIndex: number, code: string) => {
    const annotationSchemaCloned = cloneDeep(annotationSchema);
    const codes = annotationSchemaCloned[itemIndex].codes || [];
    annotationSchemaCloned[itemIndex].codes = codes.filter(
      (c: string) => c !== code,
    );
    onAnnotationSchemaChanged(annotationSchemaCloned);
  };

  return (
    <div>
      <div>
        {map(annotationSchema, (annotationField, index) => {
          return (
            <div
              key={index}
              className="mb-4 grid grid-cols-3 gap-4 border-b pb-4"
            >
              <div>
                <Label className="text-caption mb-0.5">Key</Label>
                <Input
                  disabled={annotationField.isSystem || hasBeenSaved}
                  value={annotationField.fieldKey}
                  onChange={(event) =>
                    onAnnotationFieldChanged({
                      itemIndex: index,
                      field: "fieldKey",
                      value: event?.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label className="text-caption mb-0.5">Type</Label>
                <Select
                  disabled={annotationField.isSystem || hasBeenSaved}
                  value={annotationField.fieldType}
                  onValueChange={(fieldType) =>
                    onAnnotationFieldChanged({
                      itemIndex: index,
                      field: "fieldType",
                      value: fieldType,
                    })
                  }
                >
                  <SelectTrigger id="annotation-type" className="w-[180px]">
                    <SelectValue placeholder="Select a field type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="string">string</SelectItem>
                    <SelectItem value="number">number</SelectItem>
                    <SelectItem value="boolean">boolean</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-caption mb-0.5">Default value</Label>
                {(annotationField.fieldType === "boolean" && (
                  <Checkbox
                    checked={annotationField.value}
                    disabled={annotationField.isSystem || hasBeenSaved}
                    onCheckedChange={(checked) =>
                      onAnnotationFieldChanged({
                        itemIndex: index,
                        field: "value",
                        value: checked,
                      })
                    }
                  />
                )) || (
                  <Input
                    value={annotationField.value}
                    disabled={annotationField.isSystem || hasBeenSaved}
                    type={
                      annotationField.fieldType === "string" ? "text" : "number"
                    }
                    onChange={(event) =>
                      onAnnotationFieldChanged({
                        itemIndex: index,
                        field: "value",
                        value: event?.target.value,
                      })
                    }
                  />
                )}
              </div>
              {annotationField.fieldType === "string" &&
                !annotationField.isSystem && (
                  <Flag flag="HAS_CODEBOOKS">
                    <div className="col-span-3">
                      <CodesEditor
                        codes={annotationField.codes || []}
                        disabled={hasBeenSaved}
                        onAddCode={(code) => onAddCode(index, code)}
                        onRemoveCode={(code) => onRemoveCode(index, code)}
                      />
                    </div>
                  </Flag>
                )}
              {!annotationField.isSystem && (
                <div className="col-start-3 flex justify-end">
                  <Button
                    disabled={hasBeenSaved}
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteAnnotationFieldClicked(index)}
                  >
                    <Trash />
                    Remove
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div>
        <Button disabled={hasBeenSaved} onClick={onCreateNewSchemaField}>
          Create field
        </Button>
      </div>
    </div>
  );
}
