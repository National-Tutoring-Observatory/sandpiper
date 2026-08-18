import { describe, expect, it } from "vitest";
import findInvalidAnnotationValues from "../helpers/findInvalidAnnotationValues";

describe("findInvalidAnnotationValues", () => {
  it("returns nothing when every value matches its field type", () => {
    const result = findInvalidAnnotationValues(
      { IS_QUESTION: ["TRUE", "FALSE"], SCORE: ["1", "2"] },
      { IS_QUESTION: "boolean", SCORE: "number" },
    );

    expect(result).toEqual([]);
  });

  it("reports the values a boolean field cannot read", () => {
    const result = findInvalidAnnotationValues(
      { IS_QUESTION: ["TRUE", "maybe", "unsure"] },
      { IS_QUESTION: "boolean" },
    );

    expect(result).toEqual([
      {
        fieldKey: "IS_QUESTION",
        fieldType: "boolean",
        values: ["maybe", "unsure"],
      },
    ]);
  });

  it("reports the values a number field cannot read", () => {
    const result = findInvalidAnnotationValues(
      { SCORE: ["3", "high"] },
      { SCORE: "number" },
    );

    expect(result).toEqual([
      { fieldKey: "SCORE", fieldType: "number", values: ["high"] },
    ]);
  });

  it("reports each failing field separately", () => {
    const result = findInvalidAnnotationValues(
      { IS_QUESTION: ["maybe"], SCORE: ["high"] },
      { IS_QUESTION: "boolean", SCORE: "number" },
    );

    expect(result).toEqual([
      { fieldKey: "IS_QUESTION", fieldType: "boolean", values: ["maybe"] },
      { fieldKey: "SCORE", fieldType: "number", values: ["high"] },
    ]);
  });

  it("accepts anything for a string field", () => {
    const result = findInvalidAnnotationValues(
      { TUTOR_MOVE: ["EXPLAIN", "0", "maybe"] },
      { TUTOR_MOVE: "string" },
    );

    expect(result).toEqual([]);
  });

  it("accepts anything for a field with no declared type", () => {
    const result = findInvalidAnnotationValues(
      { NEW_FIELD: ["maybe"] },
      { IS_QUESTION: "boolean" },
    );

    expect(result).toEqual([]);
  });
});
