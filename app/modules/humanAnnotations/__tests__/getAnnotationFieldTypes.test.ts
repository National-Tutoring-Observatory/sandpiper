import { describe, expect, it } from "vitest";
import type { Run } from "~/modules/runs/runs.types";
import getAnnotationFieldTypes from "../helpers/getAnnotationFieldTypes";

function buildRun(
  annotationSchema: Array<{
    fieldKey: string;
    fieldType?: string;
    isSystem?: boolean;
  }>,
  isHuman = false,
): Run {
  return {
    isHuman,
    snapshot: {
      prompt: {
        annotationSchema: annotationSchema.map((field) => ({
          value: "",
          isSystem: field.isSystem ?? false,
          fieldKey: field.fieldKey,
          fieldType: field.fieldType,
        })),
      },
    },
  } as unknown as Run;
}

describe("getAnnotationFieldTypes", () => {
  it("reads field types from a run snapshot", () => {
    const runs = [
      buildRun([
        { fieldKey: "IS_QUESTION", fieldType: "boolean" },
        { fieldKey: "SCORE", fieldType: "number" },
        { fieldKey: "TUTOR_MOVE", fieldType: "string" },
      ]),
    ];

    expect(getAnnotationFieldTypes(runs)).toEqual({
      IS_QUESTION: "boolean",
      SCORE: "number",
      TUTOR_MOVE: "string",
    });
  });

  it("merges field types across runs", () => {
    const runs = [
      buildRun([{ fieldKey: "IS_QUESTION", fieldType: "boolean" }]),
      buildRun([{ fieldKey: "SCORE", fieldType: "number" }]),
    ];

    expect(getAnnotationFieldTypes(runs)).toEqual({
      IS_QUESTION: "boolean",
      SCORE: "number",
    });
  });

  it("skips system fields", () => {
    const runs = [
      buildRun([
        { fieldKey: "_id", fieldType: "string", isSystem: true },
        { fieldKey: "IS_QUESTION", fieldType: "boolean" },
      ]),
    ];

    expect(getAnnotationFieldTypes(runs)).toEqual({ IS_QUESTION: "boolean" });
  });

  it("ignores human runs, whose schema is inferred from a CSV", () => {
    const runs = [
      buildRun([{ fieldKey: "IS_QUESTION", fieldType: "string" }], true),
      buildRun([{ fieldKey: "IS_QUESTION", fieldType: "boolean" }]),
    ];

    expect(getAnnotationFieldTypes(runs)).toEqual({ IS_QUESTION: "boolean" });
  });

  it("falls back to string when two runs disagree on a field type", () => {
    const runs = [
      buildRun([{ fieldKey: "SCORE", fieldType: "number" }]),
      buildRun([{ fieldKey: "SCORE", fieldType: "boolean" }]),
    ];

    expect(getAnnotationFieldTypes(runs)).toEqual({ SCORE: "string" });
  });

  it("omits fields with no declared type", () => {
    const runs = [buildRun([{ fieldKey: "TUTOR_MOVE" }])];

    expect(getAnnotationFieldTypes(runs)).toEqual({});
  });

  it("returns an empty map when no runs have a snapshot schema", () => {
    expect(getAnnotationFieldTypes([{} as Run])).toEqual({});
  });

  it("keeps the declared type for field names inherited from Object", () => {
    const runs = [
      buildRun([
        { fieldKey: "constructor", fieldType: "boolean" },
        { fieldKey: "__proto__", fieldType: "number" },
        { fieldKey: "toString", fieldType: "boolean" },
      ]),
    ];

    const fieldTypes = getAnnotationFieldTypes(runs);

    expect(fieldTypes["constructor"]).toBe("boolean");
    expect(fieldTypes["__proto__"]).toBe("number");
    expect(fieldTypes["toString"]).toBe("boolean");
  });
});
