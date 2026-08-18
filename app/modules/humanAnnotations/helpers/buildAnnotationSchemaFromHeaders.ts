import type { AnnotationSchemaItem } from "~/modules/prompts/prompts.types";
import parseAnnotationColumn from "./parseAnnotationColumns";

function getDefaultValue(fieldType: string): unknown {
  if (fieldType === "boolean") return false;
  if (fieldType === "number") return 0;
  return "";
}

export default function buildAnnotationSchemaFromHeaders(
  headers: string[],
  fieldTypes: Record<string, string>,
): AnnotationSchemaItem[] {
  const fieldSet = new Set<string>();

  for (const header of headers) {
    const parsed = parseAnnotationColumn(header);
    if (!parsed) continue;
    fieldSet.add(parsed.field);
  }

  return Array.from(fieldSet).map((fieldKey) => {
    const fieldType = fieldTypes[fieldKey] ?? "string";

    return {
      fieldKey,
      fieldType,
      value: getDefaultValue(fieldType),
      isSystem: false,
    };
  });
}
