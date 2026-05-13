import type { AnnotationTypeOptions } from "~/modules/annotations/helpers/annotationTypes";
import adjudicatePerSession from "../../../../workers/prompts/adjudicatePerSession.prompt.md?raw";
import adjudicatePerUtterance from "../../../../workers/prompts/adjudicatePerUtterance.prompt.md?raw";
import annotatePerSession from "../../../../workers/prompts/annotatePerSession.prompt.md?raw";
import annotatePerUtterance from "../../../../workers/prompts/annotatePerUtterance.prompt.md?raw";
import verifyPerSession from "../../../../workers/prompts/verifyPerSession.prompt.md?raw";
import verifyPerUtterance from "../../../../workers/prompts/verifyPerUtterance.prompt.md?raw";

export type SystemPromptKind = "annotation" | "verify" | "adjudicate";

const SYSTEM_PROMPTS: Record<
  SystemPromptKind,
  Record<AnnotationTypeOptions, string>
> = {
  annotation: {
    PER_UTTERANCE: annotatePerUtterance,
    PER_SESSION: annotatePerSession,
  },
  verify: {
    PER_UTTERANCE: verifyPerUtterance,
    PER_SESSION: verifyPerSession,
  },
  adjudicate: {
    PER_UTTERANCE: adjudicatePerUtterance,
    PER_SESSION: adjudicatePerSession,
  },
};

export default function getSystemPrompt(
  kind: SystemPromptKind,
  annotationType: AnnotationTypeOptions,
): string {
  if (!annotationType) return "";
  return SYSTEM_PROMPTS[kind]?.[annotationType] ?? "";
}
