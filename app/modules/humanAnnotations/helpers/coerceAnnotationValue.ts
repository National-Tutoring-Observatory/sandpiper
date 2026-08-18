export type CoercionResult = { ok: true; value: unknown } | { ok: false };

const TRUE_VALUES = new Set(["true", "1", "yes", "y"]);
const FALSE_VALUES = new Set(["false", "0", "no", "n"]);

export default function coerceAnnotationValue(
  raw: string,
  fieldType?: string,
): CoercionResult {
  const trimmed = raw.trim();

  if (fieldType === "boolean") {
    const normalized = trimmed.toLowerCase();
    if (TRUE_VALUES.has(normalized)) return { ok: true, value: true };
    if (FALSE_VALUES.has(normalized)) return { ok: true, value: false };
    return { ok: false };
  }

  if (fieldType === "number") {
    const parsed = Number(trimmed);
    if (trimmed === "" || !Number.isFinite(parsed)) return { ok: false };
    return { ok: true, value: parsed };
  }

  return { ok: true, value: raw };
}
