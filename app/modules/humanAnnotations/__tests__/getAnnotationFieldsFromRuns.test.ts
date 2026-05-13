import { describe, expect, it } from "vitest";
import type { Run } from "~/modules/runs/runs.types";
import getAnnotationFieldsFromRuns from "../helpers/getAnnotationFieldsFromRuns";

function mockRun(fields: Array<{ fieldKey: string; isSystem?: boolean }>): Run {
  return {
    _id: "run1",
    name: "Test Run",
    project: "proj1",
    annotationType: "PER_UTTERANCE",
    sessions: [],
    snapshot: {
      prompt: {
        name: "Test",
        userPrompt: "",
        annotationSchema: fields.map((f) => ({
          fieldKey: f.fieldKey,
          value: "",
          isSystem: f.isSystem ?? false,
        })),
        annotationType: "PER_UTTERANCE",
        version: 1,
        systemPrompt: "",
        verifySystemPrompt: "",
        adjudicateSystemPrompt: "",
      },
      model: { code: "gpt-4", provider: "OPENAI", name: "GPT-4" },
    },
    isRunning: false,
    isComplete: true,
    hasErrored: false,
    createdAt: new Date(),
    startedAt: new Date(),
    finishedAt: new Date(),
    isExporting: false,
    hasExportedCSV: false,
    hasExportedJSONL: false,
    shouldRunVerification: false,
    createdBy: "user-123",
  } as Run;
}

describe("getAnnotationFieldsFromRuns", () => {
  it("returns empty array for no runs", () => {
    expect(getAnnotationFieldsFromRuns([])).toEqual([]);
  });

  it("extracts non-system fields from a single run", () => {
    const runs = [
      mockRun([
        { fieldKey: "TUTOR_MOVE" },
        { fieldKey: "ASKING_FEELING" },
        { fieldKey: "identifiedBy", isSystem: true },
      ]),
    ];

    const result = getAnnotationFieldsFromRuns(runs);
    expect(result).toEqual([
      { fieldKey: "TUTOR_MOVE", runCount: 1 },
      { fieldKey: "ASKING_FEELING", runCount: 1 },
    ]);
  });

  it("deduplicates fields across runs and counts correctly", () => {
    const runs = [
      mockRun([{ fieldKey: "TUTOR_MOVE" }, { fieldKey: "ASKING_FEELING" }]),
      mockRun([{ fieldKey: "TUTOR_MOVE" }, { fieldKey: "CLARITY" }]),
    ];

    const result = getAnnotationFieldsFromRuns(runs);
    expect(result).toContainEqual({ fieldKey: "TUTOR_MOVE", runCount: 2 });
    expect(result).toContainEqual({ fieldKey: "ASKING_FEELING", runCount: 1 });
    expect(result).toContainEqual({ fieldKey: "CLARITY", runCount: 1 });
  });

  it("handles runs with no annotation schema", () => {
    const run = {
      ...mockRun([]),
      snapshot: { prompt: undefined, model: undefined },
    } as unknown as Run;

    expect(getAnnotationFieldsFromRuns([run])).toEqual([]);
  });
});
