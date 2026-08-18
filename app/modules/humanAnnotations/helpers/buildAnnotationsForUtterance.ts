import coerceAnnotationValue from "./coerceAnnotationValue";
import parseAnnotationColumn from "./parseAnnotationColumns";

interface AnnotationObject {
  _id: string;
  identifiedBy: "HUMAN";
  [key: string]: unknown;
}

export default function buildAnnotationsForUtterance(
  row: Record<string, string>,
  utteranceId: string,
  annotator: string,
  headers: string[],
  fieldTypes: Record<string, string>,
): AnnotationObject[] {
  // Group columns by index — each index produces one annotation object
  const groups = new Map<number, Record<string, unknown>>();

  for (const header of headers) {
    const parsed = parseAnnotationColumn(header);
    if (!parsed || parsed.annotator !== annotator) continue;

    const value = row[header];
    if (value === undefined || value === "") continue;

    const coerced = coerceAnnotationValue(value, fieldTypes[parsed.field]);
    if (!coerced.ok) {
      // Fail the run rather than drop the cell — a silently missing gold label
      // shrinks the set that agreement is scored over with nobody told
      throw new Error(
        `${parsed.field} expects ${fieldTypes[parsed.field]} values but found "${value}" on utterance ${utteranceId}`,
      );
    }

    if (!groups.has(parsed.index)) {
      groups.set(parsed.index, {});
    }

    groups.get(parsed.index)![parsed.field] = coerced.value;
  }

  const annotations: AnnotationObject[] = [];

  const sortedIndices = [...groups.keys()].sort((a, b) => a - b);

  for (const index of sortedIndices) {
    const fields = groups.get(index)!;
    if (Object.keys(fields).length === 0) continue;

    annotations.push({
      _id: utteranceId,
      identifiedBy: "HUMAN",
      ...fields,
    });
  }

  return annotations;
}
