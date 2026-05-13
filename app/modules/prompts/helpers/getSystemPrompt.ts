import { readFileSync } from "fs";
import path from "path";
import { PROJECT_ROOT } from "~/helpers/projectRoot";
import type { AnnotationTypeOptions } from "~/modules/annotations/helpers/annotationTypes";

export type SystemPromptKind = "annotation" | "verify" | "adjudicate";

const KIND_TO_FILE_PREFIX: Record<SystemPromptKind, string> = {
  annotation: "annotate",
  verify: "verify",
  adjudicate: "adjudicate",
};

const cache = new Map<string, string>();

export default function getSystemPrompt(
  kind: SystemPromptKind,
  annotationType: AnnotationTypeOptions,
): string {
  if (!annotationType) return "";
  const filePrefix = KIND_TO_FILE_PREFIX[kind];
  if (!filePrefix) return "";

  const suffix =
    annotationType === "PER_UTTERANCE" ? "PerUtterance" : "PerSession";
  const fullPath = path.join(
    PROJECT_ROOT,
    "workers",
    "prompts",
    `${filePrefix}${suffix}.prompt.md`,
  );

  let cached = cache.get(fullPath);
  if (cached === undefined) {
    cached = readFileSync(fullPath, "utf-8");
    cache.set(fullPath, cached);
  }
  return cached;
}
