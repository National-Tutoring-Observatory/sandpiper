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
import map from "lodash/map";
import Flag from "~/modules/featureFlags/components/flag";
import CodesViewer from "./codesViewer";

export default function AnnotationSchemaViewer({
  annotationSchema,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  annotationSchema: any[];
}) {
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
                <Input disabled={true} value={annotationField.fieldKey} />
              </div>
              <div>
                <Label className="text-caption mb-0.5">Type</Label>
                <Select disabled={true} value={annotationField.fieldType}>
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
                  <Checkbox checked={annotationField.value} disabled={true} />
                )) || (
                  <Input
                    value={annotationField.value}
                    disabled={true}
                    type={
                      annotationField.fieldType === "string" ? "text" : "number"
                    }
                  />
                )}
              </div>
              {annotationField.fieldType === "string" && (
                <Flag flag="HAS_CODEBOOKS">
                  <div className="col-span-3">
                    <CodesViewer codes={annotationField.codes || []} />
                  </div>
                </Flag>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
