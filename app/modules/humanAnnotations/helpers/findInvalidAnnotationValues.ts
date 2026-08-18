import type { InvalidAnnotationField } from "../humanAnnotations.types";
import coerceAnnotationValue from "./coerceAnnotationValue";

export default function findInvalidAnnotationValues(
  valuesByField: Record<string, string[]>,
  fieldTypes: Record<string, string>,
): InvalidAnnotationField[] {
  const invalidFields: InvalidAnnotationField[] = [];

  for (const [fieldKey, values] of Object.entries(valuesByField)) {
    const fieldType = fieldTypes[fieldKey];
    if (!fieldType || fieldType === "string") continue;
    if (!Array.isArray(values)) continue;

    const invalidValues = values.filter(
      (value) =>
        typeof value === "string" &&
        !coerceAnnotationValue(value, fieldType).ok,
    );

    if (invalidValues.length > 0) {
      invalidFields.push({ fieldKey, fieldType, values: invalidValues });
    }
  }

  return invalidFields;
}
