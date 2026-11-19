/**
 * Runs the worker's real annotatePerUtterance task against a local model.
 * Only the database, sockets, storage and credit notices are stubbed; the
 * prompts, response schema, LLM client and provider are the ones production
 * uses.
 *
 *   AI_GATEWAY_BASE_URL=http://127.0.0.1:11434/v1 LOCAL_MODEL=mistral-nemo \
 *     yarn vitest run -c scripts/localModels/vitest.config.ts
 */
import type { Job } from "bullmq";
import fse from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, it, vi } from "vitest";
import DEFAULT_PROMPTS from "../../app/modules/prompts/helpers/defaultPrompts";
import type { SessionFile } from "../../app/modules/sessions/sessions.types";
import annotatePerUtterance from "../../workers/tasks/annotatePerUtterance";

const fixturePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures/syntheticSession.json",
);

const uploaded: { session?: SessionFile } = {};

vi.mock("../../app/modules/runs/run", () => ({
  RunService: {
    findById: vi.fn(async () => ({
      createdBy: "local-user",
      sessions: [{ sessionId: "synthetic", status: "DONE" }],
    })),
  },
}));

vi.mock("../../workers/helpers/updateRunSession", () => ({
  default: vi.fn(async () => undefined),
}));

vi.mock("../../workers/helpers/emitFromJob", () => ({
  default: vi.fn(async () => undefined),
}));

// Credit notices are queued through Redis, which a local check does not run.
vi.mock("../../app/modules/notifications/notification", () => ({
  NotificationService: {
    notifyCreditsExhausted: vi.fn(async () => undefined),
  },
}));

vi.mock("../../app/modules/storage/helpers/getStorageAdapter", () => ({
  default: () => ({
    download: async () => fixturePath,
    upload: async ({ file }: { file: { buffer: Buffer } }) => {
      uploaded.session = JSON.parse(file.buffer.toString());
    },
  }),
}));

const model = process.env.LOCAL_MODEL;
const isConfigured = Boolean(process.env.AI_GATEWAY_BASE_URL && model);

describe.skipIf(!isConfigured)("annotatePerUtterance on a local model", () => {
  it("returns annotations that match the transcript and the codebook", async () => {
    process.env.LLM_PROVIDER = "AI_GATEWAY";
    process.env.AI_GATEWAY_KEY = process.env.AI_GATEWAY_KEY || "local";

    const prompt = DEFAULT_PROMPTS.find(
      (item) => item.name === "Tutor Moves (sample prompt)",
    )!;
    const annotationFields: Record<string, unknown> = {};
    for (const item of prompt.annotationSchema) {
      annotationFields[item.fieldKey] = item.value;
    }
    const codes = prompt.annotationSchema.find(
      (item) => item.fieldKey === "LEARNING_SUPPORT",
    )!.codes!;

    const job = {
      id: "local-check",
      data: {
        runId: "local-run",
        sessionId: "synthetic",
        inputFile: "storage/local/preAnalysis/synthetic/syntheticSession.json",
        outputFolder: "storage/local/runs/local-run/synthetic",
        prompt: {
          prompt: prompt.userPrompt,
          annotationSchema: { annotations: [annotationFields] },
          schemaItems: prompt.annotationSchema,
        },
        model,
        userId: "local-user",
        shouldRunVerification: process.env.LOCAL_VERIFY === "true",
        props: { event: "ANNOTATE_RUN", task: "PROCESS" },
      },
    } as unknown as Job;

    const result = await annotatePerUtterance(job);

    expect(result).toEqual({ status: "SUCCESS" });
    expect(uploaded.session).toBeDefined();

    const source: SessionFile = await fse.readJSON(fixturePath);
    const utteranceIds = source.transcript.map((item) => item._id);
    const annotations = uploaded.session!.transcript.flatMap(
      (item) => item.annotations,
    );

    expect(annotations.length).toBeGreaterThan(0);
    for (const annotation of annotations) {
      expect(utteranceIds).toContain(annotation._id);
      expect(codes).toContain(annotation.LEARNING_SUPPORT);
      expect(annotation.reasoning).toBeTruthy();
    }

    console.log(
      annotations
        .map((item) => `${item._id}\t${item.LEARNING_SUPPORT}`)
        .join("\n"),
    );
  });
});
