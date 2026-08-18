import { describe, expect, it } from "vitest";
import buildAnnotationSchemaFromHeaders from "../helpers/buildAnnotationSchemaFromHeaders";

describe("buildAnnotationSchemaFromHeaders", () => {
  it("builds one schema item per annotation field", () => {
    const headers = [
      "session_id",
      "annotator[joe][0]TUTOR_MOVE",
      "annotator[joe][1]TUTOR_MOVE",
      "annotator[bob][0]REASONING",
    ];

    const result = buildAnnotationSchemaFromHeaders(headers, {});

    expect(result).toEqual([
      {
        fieldKey: "TUTOR_MOVE",
        fieldType: "string",
        value: "",
        isSystem: false,
      },
      {
        fieldKey: "REASONING",
        fieldType: "string",
        value: "",
        isSystem: false,
      },
    ]);
  });

  it("carries the declared field type and a matching default value", () => {
    const headers = [
      "annotator[joe][0]IS_QUESTION",
      "annotator[joe][0]SCORE",
      "annotator[joe][0]TUTOR_MOVE",
    ];

    const result = buildAnnotationSchemaFromHeaders(headers, {
      IS_QUESTION: "boolean",
      SCORE: "number",
      TUTOR_MOVE: "string",
    });

    expect(result).toEqual([
      {
        fieldKey: "IS_QUESTION",
        fieldType: "boolean",
        value: false,
        isSystem: false,
      },
      { fieldKey: "SCORE", fieldType: "number", value: 0, isSystem: false },
      {
        fieldKey: "TUTOR_MOVE",
        fieldType: "string",
        value: "",
        isSystem: false,
      },
    ]);
  });

  it("ignores headers that are not annotation columns", () => {
    const result = buildAnnotationSchemaFromHeaders(
      ["session_id", "sequence_id", "role", "content"],
      {},
    );

    expect(result).toEqual([]);
  });
});
