import { describe, expect, it } from "vitest";
import extractAnnotationCsvMeta from "../helpers/extractAnnotationCsvMeta";

describe("extractAnnotationCsvMeta", () => {
  it("collects headers, annotators, fields and session ids", () => {
    const csv = [
      "session_id,sequence_id,annotator[joe][0]IS_QUESTION",
      "session-a.json,1,TRUE",
      "session-b.json,1,FALSE",
    ].join("\n");

    const meta = extractAnnotationCsvMeta(csv);

    expect(meta.annotators).toEqual(["joe"]);
    expect(meta.annotationFields).toEqual(["IS_QUESTION"]);
    expect(meta.sessionIds).toEqual(["session-a.json", "session-b.json"]);
  });

  it("collects the distinct values used for each annotation field", () => {
    const csv = [
      "session_id,annotator[joe][0]IS_QUESTION,annotator[bob][0]IS_QUESTION",
      "session-a.json,TRUE,FALSE",
      "session-a.json,TRUE,TRUE",
    ].join("\n");

    const meta = extractAnnotationCsvMeta(csv);

    expect(meta.valuesByField).toEqual({ IS_QUESTION: ["TRUE", "FALSE"] });
  });

  it("keeps values from different fields apart", () => {
    const csv = [
      "annotator[joe][0]IS_QUESTION,annotator[joe][0]SCORE",
      "TRUE,3",
    ].join("\n");

    const meta = extractAnnotationCsvMeta(csv);

    expect(meta.valuesByField).toEqual({
      IS_QUESTION: ["TRUE"],
      SCORE: ["3"],
    });
  });

  it("excludes empty cells", () => {
    const csv = [
      "annotator[joe][0]IS_QUESTION",
      "TRUE",
      "",
      "  ",
      "FALSE",
    ].join("\n");

    const meta = extractAnnotationCsvMeta(csv);

    expect(meta.valuesByField).toEqual({ IS_QUESTION: ["TRUE", "FALSE"] });
  });

  it("caps how many distinct values it collects per field", () => {
    const rows = Array.from({ length: 80 }, (_, i) => `value-${i}`);
    const csv = ["annotator[joe][0]TUTOR_MOVE", ...rows].join("\n");

    const meta = extractAnnotationCsvMeta(csv);

    expect(meta.valuesByField.TUTOR_MOVE).toHaveLength(50);
  });

  it("returns empty collections for empty input", () => {
    expect(extractAnnotationCsvMeta("")).toEqual({
      headers: [],
      annotators: [],
      annotationFields: [],
      sessionIds: [],
      valuesByField: {},
    });
  });
});
