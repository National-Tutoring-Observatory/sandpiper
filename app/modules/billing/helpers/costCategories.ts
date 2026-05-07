import type { LlmCostSource } from "../billingAnalytics.types";

export type CostCategory = "user-initiated" | "system";

const SOURCE_CATEGORIES: Record<LlmCostSource, CostCategory> = {
  "annotation:per-session": "user-initiated",
  "annotation:per-utterance": "user-initiated",
  "verification:per-session": "user-initiated",
  "verification:per-utterance": "user-initiated",
  "adjudication:per-session": "user-initiated",
  "adjudication:per-utterance": "user-initiated",
  "file-conversion": "system",
  "codebook-prompt-generation": "system",
  "attribute-mapping": "system",
  "prompt-alignment": "system",
};

const USER_INITIATED_SOURCES = new Set(
  Object.entries(SOURCE_CATEGORIES)
    .filter(([, category]) => category === "user-initiated")
    .map(([source]) => source),
);

export function isUserInitiatedSource(source: string): boolean {
  return USER_INITIATED_SOURCES.has(source);
}

export const USER_INITIATED_SOURCE_LIST = [...USER_INITIATED_SOURCES];
