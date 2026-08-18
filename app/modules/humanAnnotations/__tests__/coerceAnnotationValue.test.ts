import { describe, expect, it } from "vitest";
import coerceAnnotationValue from "../helpers/coerceAnnotationValue";

describe("coerceAnnotationValue", () => {
  describe("boolean fields", () => {
    it.each([
      ["true", true],
      ["TRUE", true],
      ["True", true],
      ["1", true],
      ["yes", true],
      ["YES", true],
      ["y", true],
      ["false", false],
      ["FALSE", false],
      ["False", false],
      ["0", false],
      ["no", false],
      ["NO", false],
      ["n", false],
    ])("coerces %s to %s", (raw, expected) => {
      expect(coerceAnnotationValue(raw, "boolean")).toEqual({
        ok: true,
        value: expected,
      });
    });

    it("ignores surrounding whitespace", () => {
      expect(coerceAnnotationValue("  FALSE  ", "boolean")).toEqual({
        ok: true,
        value: false,
      });
    });

    it("rejects a value it cannot read as a boolean", () => {
      expect(coerceAnnotationValue("maybe", "boolean")).toEqual({ ok: false });
    });

    it("rejects a number that is not 0 or 1", () => {
      expect(coerceAnnotationValue("2", "boolean")).toEqual({ ok: false });
    });
  });

  describe("number fields", () => {
    it("coerces an integer", () => {
      expect(coerceAnnotationValue("3", "number")).toEqual({
        ok: true,
        value: 3,
      });
    });

    it("coerces zero", () => {
      expect(coerceAnnotationValue("0", "number")).toEqual({
        ok: true,
        value: 0,
      });
    });

    it("coerces a decimal", () => {
      expect(coerceAnnotationValue("2.5", "number")).toEqual({
        ok: true,
        value: 2.5,
      });
    });

    it("coerces a negative number", () => {
      expect(coerceAnnotationValue("-1", "number")).toEqual({
        ok: true,
        value: -1,
      });
    });

    it("ignores surrounding whitespace", () => {
      expect(coerceAnnotationValue(" 4 ", "number")).toEqual({
        ok: true,
        value: 4,
      });
    });

    it("rejects a value it cannot read as a number", () => {
      expect(coerceAnnotationValue("high", "number")).toEqual({ ok: false });
    });

    it("rejects Infinity", () => {
      expect(coerceAnnotationValue("Infinity", "number")).toEqual({
        ok: false,
      });
    });
  });

  describe("string and unknown fields", () => {
    it("passes a string field through unchanged", () => {
      expect(coerceAnnotationValue("EXPLAIN", "string")).toEqual({
        ok: true,
        value: "EXPLAIN",
      });
    });

    it("keeps a numeric string when the field is a string", () => {
      expect(coerceAnnotationValue("0", "string")).toEqual({
        ok: true,
        value: "0",
      });
    });

    it("passes through when the field type is unknown", () => {
      expect(coerceAnnotationValue("FALSE", undefined)).toEqual({
        ok: true,
        value: "FALSE",
      });
    });
  });
});
