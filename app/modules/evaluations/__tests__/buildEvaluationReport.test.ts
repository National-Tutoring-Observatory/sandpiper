import { describe, expect, it } from "vitest";
import type { Run } from "~/modules/runs/runs.types";
import type { SessionFile } from "~/modules/sessions/sessions.types";
import type { Evaluation } from "../evaluations.types";
import buildEvaluationReport, {
  type SessionFileCache,
} from "../helpers/buildEvaluationReport";

function makeRun(
  id: string,
  name: string,
  opts: { isHuman?: boolean; isAdjudication?: boolean } = {},
): Run {
  return {
    _id: id,
    name,
    isHuman: opts.isHuman ?? false,
    isAdjudication: opts.isAdjudication ?? false,
    snapshot: {
      prompt: {
        annotationType: "PER_SESSION",
        name: "",
        userPrompt: "",
        annotationSchema: [],
        version: 1,
      },
      model: { code: "gpt-4", provider: "openai", name: "GPT-4" },
    },
  } as unknown as Run;
}

function makeEvaluation(
  baseRun: string,
  runs: string[],
  annotationFields: string[],
): Evaluation {
  return {
    _id: "eval-1",
    name: "Test Eval",
    project: "proj-1",
    runSet: "rs-1",
    baseRun,
    runs,
    annotationFields,
  };
}

function makeSession(quality: string | null): SessionFile {
  const annotation: Record<string, unknown> = {
    _id: "a",
    identifiedBy: "model",
  };
  if (quality !== null) annotation.quality = quality;
  return {
    transcript: [],
    leadRole: "tutor",
    annotations: [annotation],
  } as unknown as SessionFile;
}

describe("buildEvaluationReport", () => {
  it("returns zero-filled reports when no common sessions", async () => {
    const runs = [makeRun("r1", "Run 1"), makeRun("r2", "Run 2")];
    const evaluation = makeEvaluation("r1", ["r1", "r2"], ["quality"]);

    const reports = await buildEvaluationReport(evaluation, runs, {}, []);

    expect(reports).toHaveLength(1);
    expect(reports[0].fieldKey).toBe("quality");
    expect(reports[0].meanKappa).toBe(0);
    expect(reports[0].pairwise).toEqual([]);
    expect(reports[0].runSummaries).toEqual([]);
  });

  it("returns one report per annotation field", async () => {
    const runs = [makeRun("r1", "Run 1"), makeRun("r2", "Run 2")];
    const evaluation = makeEvaluation("r1", ["r1", "r2"], ["quality", "tone"]);

    const reports = await buildEvaluationReport(evaluation, runs, {}, []);

    expect(reports).toHaveLength(2);
    expect(reports.map((r) => r.fieldKey)).toEqual(["quality", "tone"]);
  });

  it("computes perfect agreement (kappa=1) when labels match", async () => {
    const session = "sess-1";
    const cache: SessionFileCache = {
      r1: { [session]: makeSession("good") },
      r2: { [session]: makeSession("good") },
    };
    const runs = [makeRun("r1", "Run 1"), makeRun("r2", "Run 2")];
    const evaluation = makeEvaluation("r1", ["r1", "r2"], ["quality"]);

    const reports = await buildEvaluationReport(evaluation, runs, cache, [
      session,
    ]);

    expect(reports[0].pairwise[0].kappa).toBe(1);
    expect(reports[0].meanKappa).toBe(1);
  });

  it("includes precision/recall/f1 when one run is the base run", async () => {
    const session = "sess-1";
    const cache: SessionFileCache = {
      base: { [session]: makeSession("good") },
      other: { [session]: makeSession("good") },
    };
    const runs = [makeRun("base", "Base Run"), makeRun("other", "Other Run")];
    const evaluation = makeEvaluation("base", ["base", "other"], ["quality"]);

    const reports = await buildEvaluationReport(evaluation, runs, cache, [
      session,
    ]);

    const pairwiseResult = reports[0].pairwise[0];
    expect(pairwiseResult.precision).toBeDefined();
    expect(pairwiseResult.recall).toBeDefined();
    expect(pairwiseResult.f1).toBeDefined();
  });

  it("does not include precision/recall/f1 for pairs not involving the base run", async () => {
    const session = "sess-1";
    const cache: SessionFileCache = {
      base: { [session]: makeSession("good") },
      r2: { [session]: makeSession("good") },
      r3: { [session]: makeSession("good") },
    };
    const runs = [
      makeRun("base", "Base"),
      makeRun("r2", "R2"),
      makeRun("r3", "R3"),
    ];
    const evaluation = makeEvaluation(
      "base",
      ["base", "r2", "r3"],
      ["quality"],
    );

    const reports = await buildEvaluationReport(evaluation, runs, cache, [
      session,
    ]);

    const r2r3Pair = reports[0].pairwise.find(
      (p) => p.runA === "r2" && p.runB === "r3",
    );
    expect(r2r3Pair).toBeDefined();
    expect(r2r3Pair!.precision).toBeUndefined();
    expect(r2r3Pair!.recall).toBeUndefined();
    expect(r2r3Pair!.f1).toBeUndefined();
  });

  it("generates all pairwise combinations for N runs", async () => {
    const session = "sess-1";
    const cache: SessionFileCache = {
      r1: { [session]: makeSession("good") },
      r2: { [session]: makeSession("good") },
      r3: { [session]: makeSession("good") },
    };
    const runs = [
      makeRun("r1", "R1"),
      makeRun("r2", "R2"),
      makeRun("r3", "R3"),
    ];
    const evaluation = makeEvaluation("r1", ["r1", "r2", "r3"], ["quality"]);

    const reports = await buildEvaluationReport(evaluation, runs, cache, [
      session,
    ]);

    expect(reports[0].pairwise).toHaveLength(3);
  });

  it("carries isHuman and isAdjudication flags in run summaries", async () => {
    const session = "sess-1";
    const cache: SessionFileCache = {
      human: { [session]: makeSession("good") },
      adj: { [session]: makeSession("good") },
    };
    const runs = [
      makeRun("human", "Human Run", { isHuman: true }),
      makeRun("adj", "Adj Run", { isAdjudication: true }),
    ];
    const evaluation = makeEvaluation("human", ["human", "adj"], ["quality"]);

    const reports = await buildEvaluationReport(evaluation, runs, cache, [
      session,
    ]);

    const humanSummary = reports[0].runSummaries.find(
      (s) => s.runId === "human",
    );
    const adjSummary = reports[0].runSummaries.find((s) => s.runId === "adj");
    expect(humanSummary!.isHuman).toBe(true);
    expect(adjSummary!.isAdjudication).toBe(true);
  });

  it("skips sessions missing from the cache", async () => {
    const session = "sess-present";
    const cache: SessionFileCache = {
      r1: { [session]: makeSession("good") },
      r2: { [session]: makeSession("good") },
    };
    const runs = [makeRun("r1", "Run 1"), makeRun("r2", "Run 2")];
    const evaluation = makeEvaluation("r1", ["r1", "r2"], ["quality"]);

    const reports = await buildEvaluationReport(evaluation, runs, cache, [
      session,
      "sess-missing",
    ]);

    expect(reports[0].pairwise[0].sampleSize).toBe(1);
  });

  describe("shouldIncludeUnannotatedSamples config", () => {
    it("includes empty annotations by default", async () => {
      const cache: SessionFileCache = {
        r1: {
          s1: makeSession("good"),
          s2: makeSession("good"),
          s3: makeSession("bad"),
        },
        r2: {
          s1: makeSession("good"),
          s2: makeSession(null),
          s3: makeSession("bad"),
        },
      };
      const runs = [makeRun("r1", "R1"), makeRun("r2", "R2")];
      const evaluation = makeEvaluation("r1", ["r1", "r2"], ["quality"]);

      const reports = await buildEvaluationReport(evaluation, runs, cache, [
        "s1",
        "s2",
        "s3",
      ]);

      expect(reports[0].pairwise[0].sampleSize).toBe(3);
    });

    it("drops pairs where both sides are empty when shouldIncludeUnannotatedSamples is false", async () => {
      const cache: SessionFileCache = {
        r1: {
          s1: makeSession("good"),
          s2: makeSession(null),
          s3: makeSession("bad"),
        },
        r2: {
          s1: makeSession("good"),
          s2: makeSession(null),
          s3: makeSession("bad"),
        },
      };
      const runs = [makeRun("r1", "R1"), makeRun("r2", "R2")];
      const evaluation = makeEvaluation("r1", ["r1", "r2"], ["quality"]);

      const reports = await buildEvaluationReport(
        evaluation,
        runs,
        cache,
        ["s1", "s2", "s3"],
        { shouldIncludeUnannotatedSamples: false },
      );

      expect(reports[0].pairwise[0].sampleSize).toBe(2);
      expect(reports[0].pairwise[0].kappa).toBe(1);
    });

    it("yields sampleSize 0 and meanKappa 0 when filtering leaves no pairs", async () => {
      const cache: SessionFileCache = {
        r1: { s1: makeSession(null) },
        r2: { s1: makeSession(null) },
      };
      const runs = [makeRun("r1", "R1"), makeRun("r2", "R2")];
      const evaluation = makeEvaluation("r1", ["r1", "r2"], ["quality"]);

      const reports = await buildEvaluationReport(
        evaluation,
        runs,
        cache,
        ["s1"],
        { shouldIncludeUnannotatedSamples: false },
      );

      expect(reports[0].pairwise[0].sampleSize).toBe(0);
      expect(reports[0].meanKappa).toBe(0);
    });

    it("computes PRF1 on filtered arrays when one run is the base run", async () => {
      const cache: SessionFileCache = {
        base: {
          s1: makeSession("good"),
          s2: makeSession(null),
          s3: makeSession("bad"),
        },
        r2: {
          s1: makeSession("good"),
          s2: makeSession(null),
          s3: makeSession("bad"),
        },
      };
      const runs = [makeRun("base", "Base"), makeRun("r2", "R2")];
      const evaluation = makeEvaluation("base", ["base", "r2"], ["quality"]);

      const reports = await buildEvaluationReport(
        evaluation,
        runs,
        cache,
        ["s1", "s2", "s3"],
        { shouldIncludeUnannotatedSamples: false },
      );

      expect(reports[0].pairwise[0].sampleSize).toBe(2);
      expect(reports[0].pairwise[0].precision).toBe(1);
      expect(reports[0].pairwise[0].recall).toBe(1);
      expect(reports[0].pairwise[0].f1).toBe(1);
    });
  });
});
