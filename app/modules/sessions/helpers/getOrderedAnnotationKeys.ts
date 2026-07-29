import type { Annotation } from "../sessions.types";

const HIDDEN_ANNOTATION_KEYS = new Set([
  "_id",
  "identifiedBy",
  "markedAs",
  "votingReason",
]);

export default function getOrderedAnnotationKeys(
  annotation: Annotation,
): string[] {
  const keys = Object.keys(annotation).filter(
    (key) => !HIDDEN_ANNOTATION_KEYS.has(key) && key !== "reasoning",
  );
  keys.sort((a, b) => a.localeCompare(b));
  if ("reasoning" in annotation) {
    keys.push("reasoning");
  }
  return keys;
}
