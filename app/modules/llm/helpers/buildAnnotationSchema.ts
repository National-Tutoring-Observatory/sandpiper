interface AnnotationSchemaObject {
  annotations: Array<Record<string, unknown>>;
}

interface SchemaItem {
  fieldKey: string;
  codes?: string[];
}

interface JsonSchemaNode {
  type: string;
  enum?: string[];
  items?: JsonSchemaNode;
  properties?: Record<string, JsonSchemaNode>;
  required?: string[];
  additionalProperties?: boolean;
}

function getJsonSchemaType(value: unknown): string {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object" && value !== null) return "object";
  return "string";
}

function buildPropertyNode(value: unknown): JsonSchemaNode {
  const type = getJsonSchemaType(value);

  if (type === "array") {
    const first = Array.isArray(value) ? value[0] : undefined;
    return { type, items: buildPropertyNode(first) };
  }

  if (type === "object") {
    const properties: Record<string, JsonSchemaNode> = {};
    const required: string[] = [];
    for (const [key, nested] of Object.entries(value as object)) {
      properties[key] = buildPropertyNode(nested);
      required.push(key);
    }
    return { type, additionalProperties: false, properties, required };
  }

  return { type };
}

export default function buildAnnotationSchema(
  annotationSchema: AnnotationSchemaObject,
  schemaItems?: SchemaItem[],
): object {
  const exampleAnnotation = annotationSchema?.annotations?.[0];

  if (!exampleAnnotation) {
    throw new Error(
      "buildAnnotationSchema: expected annotationSchema.annotations[0] to exist",
    );
  }

  const codesMap: Record<string, string[]> = {};
  if (schemaItems) {
    for (const item of schemaItems) {
      if (item.codes && item.codes.length > 0) {
        codesMap[item.fieldKey] = item.codes;
      }
    }
  }

  const properties: Record<string, JsonSchemaNode> = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(exampleAnnotation)) {
    const property = buildPropertyNode(value);
    if (codesMap[key]) {
      property.enum = codesMap[key];
    }
    properties[key] = property;
    required.push(key);
  }

  return {
    type: "object",
    additionalProperties: false,
    properties: {
      annotations: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties,
          required,
        },
      },
    },
    required: ["annotations"],
  };
}
