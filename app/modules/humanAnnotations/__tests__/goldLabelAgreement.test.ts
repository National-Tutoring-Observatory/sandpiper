import { describe, expect, it } from "vitest";
import calculateCohensKappa from "~/modules/evaluations/helpers/calculateCohensKappa";
import extractAnnotationValues from "~/modules/evaluations/helpers/extractAnnotationValues";
import type { SessionFile } from "~/modules/sessions/sessions.types";
import buildAnnotationsForUtterance from "../helpers/buildAnnotationsForUtterance";

// Evaluations compare annotation values as strings, so an untyped "TRUE" from a
// human CSV never matches the `true` an LLM run holds — the gold label scores
// zero agreement with a run it actually agrees with

function buildSession(annotationsPerUtterance: unknown[][]): SessionFile {
  return {
    transcript: annotationsPerUtterance.map((annotations, i) => ({
      _id: `utt-${i}`,
      annotations,
    })),
  } as unknown as SessionFile;
}

const HEADERS = ["annotator[joe][0]IS_QUESTION"];
const CSV_ROWS = [
  { "annotator[joe][0]IS_QUESTION": "TRUE" },
  { "annotator[joe][0]IS_QUESTION": "FALSE" },
  { "annotator[joe][0]IS_QUESTION": "TRUE" },
  { "annotator[joe][0]IS_QUESTION": "FALSE" },
];

const LLM_RUN = buildSession([
  [{ _id: "utt-0", identifiedBy: "LLM", IS_QUESTION: true }],
  [{ _id: "utt-1", identifiedBy: "LLM", IS_QUESTION: false }],
  [{ _id: "utt-2", identifiedBy: "LLM", IS_QUESTION: true }],
  [{ _id: "utt-3", identifiedBy: "LLM", IS_QUESTION: false }],
]);

function getKappaAgainstLLMRun(fieldTypes: Record<string, string>): number {
  const humanRun = buildSession(
    CSV_ROWS.map((row, i) =>
      buildAnnotationsForUtterance(row, `utt-${i}`, "joe", HEADERS, fieldTypes),
    ),
  );

  return calculateCohensKappa(
    extractAnnotationValues(humanRun, "PER_UTTERANCE", "IS_QUESTION"),
    extractAnnotationValues(LLM_RUN, "PER_UTTERANCE", "IS_QUESTION"),
  );
}

describe("gold label agreement with an LLM run", () => {
  it("scores no agreement when the boolean field has no declared type", () => {
    expect(getKappaAgainstLLMRun({})).toBe(0);
  });

  it("scores full agreement when the field is typed as boolean", () => {
    expect(getKappaAgainstLLMRun({ IS_QUESTION: "boolean" })).toBe(1);
  });
});
