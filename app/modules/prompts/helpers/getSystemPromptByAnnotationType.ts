import type { AnnotationTypeOptions } from "~/modules/annotations/helpers/annotationTypes";
import annotatePerSessionPrompt from "../../../../workers/prompts/annotatePerSession.prompt.md?raw";
import annotatePerUtterance from "../../../../workers/prompts/annotatePerUtterance.prompt.md?raw";

export default (annotationType: AnnotationTypeOptions) => {
  if (!annotationType) return "";
  return annotationType === "PER_SESSION"
    ? annotatePerSessionPrompt
    : annotatePerUtterance;
};
