import { describe, expect, it } from "vitest";
import type { Run } from "~/modules/runs/runs.types";
import {
  getRunModelCode,
  getRunModelDisplayName,
  getRunModelInfo,
} from "../runModel";

const createRun = (overrides: Partial<Run> = {}): Run =>
  ({
    _id: "run1",
    ...overrides,
  }) as Run;

describe("Run Model Helpers", () => {
  describe("getRunModelInfo", () => {
    it("should return model info when snapshot exists", () => {
      const run = createRun({
        snapshot: {
          prompt: {
            name: "p",
            userPrompt: "up",
            annotationSchema: [],
            annotationType: "PER_UTTERANCE",
            version: 1,
            systemPrompt: "",
            verifySystemPrompt: "",
            adjudicateSystemPrompt: "",
          },
          model: {
            code: "google.gemini-2.5-flash",
            name: "Gemini Flash",
            provider: "Google",
          },
        },
      });

      const info = getRunModelInfo(run);

      expect(info).toBeDefined();
      expect(info?.code).toBe("google.gemini-2.5-flash");
      expect(info?.provider).toBe("Google");
    });

    it("should return undefined when no snapshot", () => {
      const run = createRun();
      const info = getRunModelInfo(run);
      expect(info).toBeUndefined();
    });
  });

  describe("getRunModelCode", () => {
    it("should return snapshot.model.code when available", () => {
      const run = createRun({
        snapshot: {
          prompt: {
            name: "p",
            userPrompt: "up",
            annotationSchema: [],
            annotationType: "PER_UTTERANCE",
            version: 1,
            systemPrompt: "",
            verifySystemPrompt: "",
            adjudicateSystemPrompt: "",
          },
          model: { code: "new-code", name: "New", provider: "Provider" },
        },
      });

      expect(getRunModelCode(run)).toBe("new-code");
    });

    it("should return undefined when snapshot unavailable", () => {
      const run = createRun();
      expect(getRunModelCode(run)).toBeUndefined();
    });
  });

  describe("getRunModelDisplayName", () => {
    it("should use snapshot name when available", () => {
      const run = createRun({
        snapshot: {
          prompt: {
            name: "p",
            userPrompt: "up",
            annotationSchema: [],
            annotationType: "PER_UTTERANCE",
            version: 1,
            systemPrompt: "",
            verifySystemPrompt: "",
            adjudicateSystemPrompt: "",
          },
          model: { code: "code", name: "Display Name", provider: "Provider" },
        },
      });

      expect(getRunModelDisplayName(run)).toBe("Display Name");
    });

    it("should return undefined when no snapshot", () => {
      const run = createRun();
      expect(getRunModelDisplayName(run)).toBeUndefined();
    });
  });
});
