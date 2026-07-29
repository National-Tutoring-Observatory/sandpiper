import { describe, expect, it } from "vitest";

import getOrderedAnnotationKeys from "../getOrderedAnnotationKeys";

describe("getOrderedAnnotationKeys", () => {
  it("orders schema fields alphabetically with reasoning last", () => {
    const annotation = {
      _id: "1",
      identifiedBy: "AI",
      reasoning: "Because...",
      MOVE_TYPE: "PROBE",
      HELP_TYPE: "HINT",
    };

    expect(getOrderedAnnotationKeys(annotation)).toEqual([
      "HELP_TYPE",
      "MOVE_TYPE",
      "reasoning",
    ]);
  });

  it("returns the same order regardless of key insertion order", () => {
    const first = {
      _id: "1",
      identifiedBy: "AI",
      reasoning: "r",
      MOVE_TYPE: "PROBE",
      HELP_TYPE: "HINT",
    };
    const second = {
      _id: "2",
      reasoning: "r",
      HELP_TYPE: "HINT",
      identifiedBy: "AI",
      MOVE_TYPE: "PROBE",
    };

    expect(getOrderedAnnotationKeys(first)).toEqual(
      getOrderedAnnotationKeys(second),
    );
  });

  it("excludes hidden bookkeeping keys", () => {
    const annotation = {
      _id: "1",
      identifiedBy: "AI",
      markedAs: "UP_VOTED" as const,
      votingReason: "good",
      SCORE: 3,
    };

    expect(getOrderedAnnotationKeys(annotation)).toEqual(["SCORE"]);
  });

  it("keeps reasoning when it is the only visible field", () => {
    const annotation = {
      _id: "1",
      identifiedBy: "AI",
      reasoning: "r",
    };

    expect(getOrderedAnnotationKeys(annotation)).toEqual(["reasoning"]);
  });

  it("handles annotations without a reasoning field", () => {
    const annotation = {
      _id: "1",
      identifiedBy: "AI",
      B_FIELD: "b",
      A_FIELD: "a",
    };

    expect(getOrderedAnnotationKeys(annotation)).toEqual([
      "A_FIELD",
      "B_FIELD",
    ]);
  });
});
