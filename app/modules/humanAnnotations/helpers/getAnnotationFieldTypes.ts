import type { Run } from "~/modules/runs/runs.types";

export default function getAnnotationFieldTypes(
  runs: Run[],
): Record<string, string> {
  // Null-prototype: a field named `constructor` or `__proto__` would otherwise
  // read an inherited value here and resolve to the wrong type
  const fieldTypes: Record<string, string> = Object.create(null);

  for (const run of runs) {
    if (run.isHuman) continue;

    const schema = run.snapshot?.prompt?.annotationSchema;
    if (!schema) continue;

    for (const field of schema) {
      if (field.isSystem || !field.fieldType) continue;

      const existing = fieldTypes[field.fieldKey];
      if (existing && existing !== field.fieldType) {
        fieldTypes[field.fieldKey] = "string";
        continue;
      }

      fieldTypes[field.fieldKey] = field.fieldType;
    }
  }

  return fieldTypes;
}
