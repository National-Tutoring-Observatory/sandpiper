import fse from "fs-extra";
import { csv2json } from "json-2-csv";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { handler } from "../app";

vi.mock("fs-extra", () => ({
  default: {
    readJSON: vi.fn(),
    outputFile: vi.fn(),
    readFile: vi.fn().mockResolvedValue(Buffer.from("")),
    ensureDir: vi.fn(),
  },
}));

vi.mock("~/modules/storage/helpers/getStorageAdapter", () => ({
  default: () => ({
    download: vi.fn().mockResolvedValue("/tmp/fake-path.json"),
    upload: vi.fn().mockResolvedValue(undefined),
  }),
}));

const makeRun = (index: number, overrides: Record<string, any> = {}) => ({
  _id: `run${index}`,
  project: "proj1",
  name: `Test Run ${index}`,
  annotationType: "PER_UTTERANCE",
  prompt: `prompt${index}`,
  promptVersion: 1,
  sessions: [
    { sessionId: "mongo-id-abc", name: "session-abc.json" },
    { sessionId: "mongo-id-def", name: "session-def.json" },
  ],
  snapshot: {
    prompt: {
      name: "Test Prompt",
      userPrompt: "Annotate this",
      annotationType: "PER_UTTERANCE",
      annotationSchema: [
        { fieldKey: "score" },
        { fieldKey: "label" },
        { fieldKey: "quality" },
        { fieldKey: "rating" },
      ],
      version: 1,
      systemPrompt: "ANNOTATION SYSTEM PROMPT",
      verifySystemPrompt: "",
      adjudicateSystemPrompt: "",
    },
    model: { code: "gpt-4", name: "GPT-4", provider: "openai" },
  },
  ...overrides,
});

const makeRunSet = (overrides: Record<string, any> = {}) => ({
  _id: "runset1",
  project: "proj1",
  name: "Test Run Set",
  annotationType: "PER_UTTERANCE",
  runs: ["run1", "run2"],
  sessions: [],
  ...overrides,
});

const makeTranscript = (
  sessionId: string,
  opts: { utteranceAnnotations?: boolean; sessionAnnotations?: boolean } = {},
) => {
  const transcript: any[] = [
    {
      _id: `${sessionId}-u1`,
      session_id: sessionId,
      role: "Tutor",
      content: "Hello",
      sequence_id: "1",
    },
    {
      _id: `${sessionId}-u2`,
      session_id: sessionId,
      role: "Student",
      content: "Hi there",
      sequence_id: "2",
    },
  ];

  if (opts.utteranceAnnotations) {
    transcript[0].annotations = [
      {
        _id: `${sessionId}-u1`,
        score: 5,
        label: "greeting",
        markedAs: "UP_VOTED",
        votingReason: "Correct annotation",
      },
    ];
    transcript[1].annotations = [
      { _id: `${sessionId}-u2`, score: 3, label: "response" },
    ];
  }

  const result: any = { transcript };

  if (opts.sessionAnnotations) {
    result.annotations = [
      {
        _id: sessionId,
        quality: "high",
        rating: 4,
        markedAs: "DOWN_VOTED",
        votingReason: "Incorrect quality",
      },
    ];
  }

  return result;
};

describe("outputRunSetDataToCSV", () => {
  let capturedCsvFiles: Record<string, string>;

  beforeEach(() => {
    vi.clearAllMocks();
    capturedCsvFiles = {};

    vi.mocked(fse.outputFile).mockImplementation(
      async (path: any, content: any) => {
        capturedCsvFiles[path] = content;
      },
    );
  });

  function setupTranscripts(
    runs: ReturnType<typeof makeRun>[],
    opts: { utteranceAnnotations?: boolean; sessionAnnotations?: boolean },
  ) {
    const sessionIds: Record<string, string> = {
      "mongo-id-abc": "ORIGINAL_S1",
      "mongo-id-def": "ORIGINAL_S2",
    };

    let callIndex = 0;
    const sessionOrder = runs.flatMap((r) =>
      r.sessions.map((s) => s.sessionId),
    );

    vi.mocked(fse.readJSON).mockImplementation(async () => {
      const mongoId = sessionOrder[callIndex++];
      return makeTranscript(sessionIds[mongoId], opts);
    });
  }

  function parseCsv(filename: string) {
    const csvPath = Object.keys(capturedCsvFiles).find((p) =>
      p.includes(filename),
    );
    return csv2json(capturedCsvFiles[csvPath!]);
  }

  describe("PER_UTTERANCE", () => {
    it("preserves original session_id from transcript data", async () => {
      const runs = [makeRun(1), makeRun(2)];
      const runSet = makeRunSet({ annotationType: "PER_UTTERANCE" });
      setupTranscripts(runs, { utteranceAnnotations: true });

      await handler({
        body: {
          runSet: runSet as any,
          runs: runs as any,
          teamId: "team1",
          inputFolder: "storage/proj1/runs",
          outputFolder: "storage/proj1/run-sets/runset1/exports",
        },
      });

      const rows = parseCsv("utterances.csv");

      expect(rows[0]).toHaveProperty("session_id", "ORIGINAL_S1");
      expect(rows[0]).toHaveProperty("sequence_id");
      expect(rows[2]).toHaveProperty("session_id", "ORIGINAL_S2");
    });

    it("includes annotation and metadata columns from multiple runs", async () => {
      const runs = [makeRun(1), makeRun(2)];
      const runSet = makeRunSet({ annotationType: "PER_UTTERANCE" });
      setupTranscripts(runs, { utteranceAnnotations: true });

      await handler({
        body: {
          runSet: runSet as any,
          runs: runs as any,
          teamId: "team1",
          inputFolder: "storage/proj1/runs",
          outputFolder: "storage/proj1/run-sets/runset1/exports",
        },
      });

      const rows = parseCsv("utterances.csv");

      expect(rows[0]).toHaveProperty("annotator[AI-0][0]score", 5);
      expect(rows[0]).toHaveProperty("annotator[AI-1][0]score", 5);
      expect(rows[0]).toHaveProperty("annotator[AI-0][0]label", "greeting");
      expect(rows[0]).toHaveProperty("annotator[AI-1][0]label", "greeting");
    });

    it("includes voting columns (markedAs, votingReason)", async () => {
      const runs = [makeRun(1), makeRun(2)];
      const runSet = makeRunSet({ annotationType: "PER_UTTERANCE" });
      setupTranscripts(runs, { utteranceAnnotations: true });

      await handler({
        body: {
          runSet: runSet as any,
          runs: runs as any,
          teamId: "team1",
          inputFolder: "storage/proj1/runs",
          outputFolder: "storage/proj1/run-sets/runset1/exports",
        },
      });

      const rows = parseCsv("utterances.csv");

      expect(rows[0]).toHaveProperty("annotator[AI-0][0]markedAs", "UP_VOTED");
      expect(rows[0]).toHaveProperty(
        "annotator[AI-0][0]votingReason",
        "Correct annotation",
      );
      expect(rows[1]).toHaveProperty("annotator[AI-0][0]markedAs", "");
      expect(rows[1]).toHaveProperty("annotator[AI-0][0]votingReason", "");
    });

    it("does not include _sessionRef in CSV output", async () => {
      const runs = [makeRun(1), makeRun(2)];
      const runSet = makeRunSet({ annotationType: "PER_UTTERANCE" });
      setupTranscripts(runs, { utteranceAnnotations: true });

      await handler({
        body: {
          runSet: runSet as any,
          runs: runs as any,
          teamId: "team1",
          inputFolder: "storage/proj1/runs",
          outputFolder: "storage/proj1/run-sets/runset1/exports",
        },
      });

      const rows = parseCsv("utterances.csv");

      expect(rows[0]).not.toHaveProperty("_sessionRef");
    });
  });

  describe("PER_SESSION", () => {
    it("includes _id and session_id columns in sessions CSV", async () => {
      const runs = [
        makeRun(1, { annotationType: "PER_SESSION" }),
        makeRun(2, { annotationType: "PER_SESSION" }),
      ];
      const runSet = makeRunSet({ annotationType: "PER_SESSION" });
      setupTranscripts(runs, { sessionAnnotations: true });

      await handler({
        body: {
          runSet: runSet as any,
          runs: runs as any,
          teamId: "team1",
          inputFolder: "storage/proj1/runs",
          outputFolder: "storage/proj1/run-sets/runset1/exports",
        },
      });

      const rows = parseCsv("sessions.csv");

      expect(rows[0]).toHaveProperty("_id", "mongo-id-abc");
      expect(rows[1]).toHaveProperty("_id", "mongo-id-def");
      expect(rows[0]).toHaveProperty("session_id", "ORIGINAL_S1");
      expect(rows[1]).toHaveProperty("session_id", "ORIGINAL_S2");
    });

    it("includes annotation and metadata columns from multiple runs", async () => {
      const runs = [
        makeRun(1, { annotationType: "PER_SESSION" }),
        makeRun(2, { annotationType: "PER_SESSION" }),
      ];
      const runSet = makeRunSet({ annotationType: "PER_SESSION" });
      setupTranscripts(runs, { sessionAnnotations: true });

      await handler({
        body: {
          runSet: runSet as any,
          runs: runs as any,
          teamId: "team1",
          inputFolder: "storage/proj1/runs",
          outputFolder: "storage/proj1/run-sets/runset1/exports",
        },
      });

      const rows = parseCsv("sessions.csv");

      expect(rows[0]).toHaveProperty("annotator[AI-0][0]quality", "high");
      expect(rows[0]).toHaveProperty("annotator[AI-1][0]quality", "high");
      expect(rows[0]).toHaveProperty("annotator[AI-0][0]rating", 4);
      expect(rows[0]).toHaveProperty("annotator[AI-1][0]rating", 4);
    });

    it("includes voting columns (markedAs, votingReason)", async () => {
      const runs = [
        makeRun(1, { annotationType: "PER_SESSION" }),
        makeRun(2, { annotationType: "PER_SESSION" }),
      ];
      const runSet = makeRunSet({ annotationType: "PER_SESSION" });
      setupTranscripts(runs, { sessionAnnotations: true });

      await handler({
        body: {
          runSet: runSet as any,
          runs: runs as any,
          teamId: "team1",
          inputFolder: "storage/proj1/runs",
          outputFolder: "storage/proj1/run-sets/runset1/exports",
        },
      });

      const rows = parseCsv("sessions.csv");

      expect(rows[0]).toHaveProperty(
        "annotator[AI-0][0]markedAs",
        "DOWN_VOTED",
      );
      expect(rows[0]).toHaveProperty(
        "annotator[AI-0][0]votingReason",
        "Incorrect quality",
      );
    });
  });

  it("includes system prompts in the meta CSV", async () => {
    const runs = [makeRun(1), makeRun(2)];
    const runSet = makeRunSet();

    let callIndex = 0;
    const sessionOrder = runs.flatMap((r) =>
      r.sessions.map((s) => s.sessionId),
    );
    vi.mocked(fse.readJSON).mockImplementation(async () => {
      const sessionId = sessionOrder[callIndex++];
      return makeTranscript(sessionId);
    });

    await handler({
      body: {
        runSet: runSet as any,
        runs: runs as any,
        teamId: "team1",
        inputFolder: "storage/proj1/runs",
        outputFolder: "storage/proj1/run-sets/runset1/exports",
      },
    });

    const metaPath = Object.keys(capturedCsvFiles).find((p) =>
      p.includes("meta.csv"),
    );
    expect(metaPath).toBeDefined();

    const csv = capturedCsvFiles[metaPath!];
    const headerLine = csv.split("\n")[0];
    expect(headerLine).toContain("promptSystemPrompt");
    expect(headerLine).toContain("promptVerifySystemPrompt");
    expect(headerLine).toContain("promptAdjudicateSystemPrompt");
    expect(csv).toContain("ANNOTATION SYSTEM PROMPT");
  });

  it("always generates meta CSV with all runs", async () => {
    const runs = [makeRun(1), makeRun(2)];
    const runSet = makeRunSet({ annotationType: "PER_UTTERANCE" });
    setupTranscripts(runs, { utteranceAnnotations: true });

    await handler({
      body: {
        runSet: runSet as any,
        runs: runs as any,
        teamId: "team1",
        inputFolder: "storage/proj1/runs",
        outputFolder: "storage/proj1/run-sets/runset1/exports",
      },
    });

    const rows = parseCsv("meta.csv");

    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveProperty("runId", "run1");
    expect(rows[0]).toHaveProperty("runName", "Test Run 1");
    expect(rows[1]).toHaveProperty("runId", "run2");
    expect(rows[1]).toHaveProperty("runName", "Test Run 2");
  });
});
