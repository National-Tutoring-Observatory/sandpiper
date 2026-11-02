import type { Providers } from "../model.types";

function makeSchemaStrict(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(makeSchemaStrict);
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node)) out[k] = makeSchemaStrict(v);
    if (out.type === "object") {
      out.additionalProperties = false;
      if (out.properties) out.required = Object.keys(out.properties);
    }
    return out;
  }
  return node;
}

export default function applySchemaToRequest({
  requestParams,
  provider,
  schema,
}: {
  requestParams: Record<string, unknown>;
  provider: Providers;
  schema?: object;
}) {
  if (schema) {
    if (provider === "Anthropic") {
      requestParams.output_format = {
        type: "json_schema",
        schema: makeSchemaStrict(schema),
      };
    } else {
      requestParams.response_format = {
        type: "json_schema",
        json_schema: {
          name: "structured_output",
          schema,
        },
      };
    }
  } else {
    requestParams.response_format = { type: "json_object" };
  }
}
