import { Types } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAvailableProviders } from "~/modules/llm/modelRegistry";
import { ProjectService } from "~/modules/projects/project";
import { PromptService } from "~/modules/prompts/prompt";
import { PromptVersionService } from "~/modules/prompts/promptVersion";
import { RunService } from "~/modules/runs/run";
import { RunSetService } from "~/modules/runSets/runSet";
import { TeamService } from "~/modules/teams/team";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";

const testModel = getAvailableProviders()[0].models[0].code;

vi.mock("~/modules/runs/services/buildRunSnapshot.server", () => ({
  default: vi.fn(
    async ({
      promptVersionNumber,
      modelCode,
    }: {
      promptVersionNumber: number;
      modelCode: string;
    }) => ({
      prompt: {
        name: "Mock Prompt",
        userPrompt: "Mock",
        annotationSchema: [],
        annotationType: "PER_UTTERANCE",
        version: promptVersionNumber,
      },
      model: { code: modelCode, provider: "openai", name: modelCode },
    }),
  ),
}));

vi.mock("~/modules/runs/helpers/buildRunSessions.server", () => ({
  default: vi.fn(async (sessionIds: string[]) =>
    sessionIds.map((id) => ({
      sessionId: id,
      name: "Mock Session",
      fileType: "",
      status: "NOT_STARTED",
      startedAt: new Date(),
      finishedAt: new Date(),
    })),
  ),
}));

describe("getRunSetPrefillData", () => {
  let projectId: string;
  let promptId: string;

  beforeEach(async () => {
    await clearDocumentDB();

    const team = await TeamService.create({ name: "Test Team" });
    const project = await ProjectService.create({
      name: "Test Project",
      team: team._id,
      createdBy: new Types.ObjectId().toString(),
    });
    projectId = project._id;

    const prompt = await PromptService.create({
      name: "Test Prompt",
      annotationType: "PER_UTTERANCE",
    });
    await PromptVersionService.create({
      prompt: prompt._id,
      version: 1,
      userPrompt: "Test prompt content",
      annotationSchema: [],
    });
    promptId = prompt._id;
  });

  describe("getPrefillDataFromRun", () => {
    it("returns null when run is not found", async () => {
      const result = await RunSetService.getPrefillDataFromRun(
        new Types.ObjectId().toString(),
        projectId,
      );

      expect(result.prefillData).toBeNull();
      expect(result.prefillSessionIds).toEqual([]);
    });

    it("returns null when run belongs to a different project (IDOR)", async () => {
      const otherTeam = await TeamService.create({ name: "Other Team" });
      const otherProject = await ProjectService.create({
        name: "Other Project",
        team: otherTeam._id,
        createdBy: new Types.ObjectId().toString(),
      });
      const run = await RunService.create({
        project: otherProject._id,
        name: "Other Run",
        sessions: [],
        annotationType: "PER_UTTERANCE",
        prompt: promptId,
        promptVersion: 1,
        modelCode: testModel,
        shouldRunVerification: false,
        createdBy: new Types.ObjectId().toString(),
      });

      const result = await RunSetService.getPrefillDataFromRun(
        run._id,
        projectId,
      );

      expect(result.prefillData).toBeNull();
      expect(result.prefillSessionIds).toEqual([]);
    });

    it("returns null when run is human-annotated", async () => {
      const humanRun = await RunService.createFromData({
        project: projectId,
        name: "Human Run",
        annotationType: "PER_UTTERANCE",
        isHuman: true,
        annotator: { name: "Alice" },
        sessions: [],
        snapshot: {
          prompt: {
            name: "Human Annotation",
            userPrompt: "",
            annotationSchema: [],
            annotationType: "PER_UTTERANCE",
            version: 1,
          },
        },
      });

      const result = await RunSetService.getPrefillDataFromRun(
        humanRun._id,
        projectId,
      );

      expect(result.prefillData).toBeNull();
      expect(result.prefillSessionIds).toEqual([]);
    });

    it("returns prefill data from an existing run", async () => {
      const sessionId = new Types.ObjectId().toString();
      const run = await RunService.create({
        project: projectId,
        name: "Test Run",
        sessions: [sessionId],
        annotationType: "PER_UTTERANCE",
        prompt: promptId,
        promptVersion: 1,
        modelCode: testModel,
        shouldRunVerification: false,
        createdBy: new Types.ObjectId().toString(),
      });

      const result = await RunSetService.getPrefillDataFromRun(
        run._id,
        projectId,
      );

      expect(result.prefillData).not.toBeNull();
      expect(result.prefillData!.sourceRunId).toBe(run._id);
      expect(result.prefillData!.sourceRunName).toBe("Test Run");
      expect(result.prefillData!.annotationType).toBe("PER_UTTERANCE");
      expect(result.prefillData!.selectedPrompts).toHaveLength(1);
      expect(result.prefillData!.selectedPrompts[0].promptId).toBe(promptId);
      expect(result.prefillData!.selectedPrompts[0].promptName).toBe(
        "Test Prompt",
      );
      expect(result.prefillData!.selectedPrompts[0].version).toBe(1);
      expect(result.prefillData!.selectedModels).toContain(testModel);
      expect(result.prefillData!.selectedSessions).toEqual([]);
      expect(result.prefillSessionIds).toContain(sessionId);
    });

    it("copies shouldRunVerification from source run", async () => {
      const run = await RunService.create({
        project: projectId,
        name: "Verified Run",
        sessions: [],
        annotationType: "PER_UTTERANCE",
        prompt: promptId,
        promptVersion: 1,
        modelCode: testModel,
        shouldRunVerification: true,
        createdBy: new Types.ObjectId().toString(),
      });

      const result = await RunSetService.getPrefillDataFromRun(
        run._id,
        projectId,
      );

      expect(result.prefillData!.shouldRunVerification).toBe(true);
    });

    it("uses empty string for prompt name when prompt no longer exists", async () => {
      const deletedId = new Types.ObjectId().toString();
      const run = await RunService.create({
        project: projectId,
        name: "Stale Run",
        sessions: [],
        annotationType: "PER_UTTERANCE",
        prompt: promptId,
        promptVersion: 1,
        modelCode: testModel,
        shouldRunVerification: false,
        createdBy: new Types.ObjectId().toString(),
      });
      await RunService.updateById(run._id, { prompt: deletedId });

      const result = await RunSetService.getPrefillDataFromRun(
        run._id,
        projectId,
      );

      expect(result.prefillData!.selectedPrompts[0].promptName).toBe("");
    });
  });

  describe("getPrefillDataFromRunSet", () => {
    it("returns null when runSet is not found", async () => {
      const result = await RunSetService.getPrefillDataFromRunSet(
        new Types.ObjectId().toString(),
        projectId,
      );

      expect(result.prefillData).toBeNull();
      expect(result.prefillSessionIds).toEqual([]);
    });

    it("returns null when runSet belongs to a different project (IDOR)", async () => {
      const otherTeam = await TeamService.create({ name: "Other Team" });
      const otherProject = await ProjectService.create({
        name: "Other Project",
        team: otherTeam._id,
        createdBy: new Types.ObjectId().toString(),
      });
      const runSet = await RunSetService.create({
        name: "Other RunSet",
        project: otherProject._id,
        annotationType: "PER_UTTERANCE",
      });

      const result = await RunSetService.getPrefillDataFromRunSet(
        runSet._id,
        projectId,
      );

      expect(result.prefillData).toBeNull();
      expect(result.prefillSessionIds).toEqual([]);
    });

    it("returns prefill data with validation error when runSet has no runs", async () => {
      const runSet = await RunSetService.create({
        name: "Empty RunSet",
        project: projectId,
        annotationType: "PER_UTTERANCE",
      });

      const result = await RunSetService.getPrefillDataFromRunSet(
        runSet._id,
        projectId,
      );

      expect(result.prefillData).not.toBeNull();
      expect(result.prefillData!.validationErrors).toContain(
        "Source runSet has no runs to use as template",
      );
    });

    it("returns prefill data from a runSet with runs", async () => {
      const sessionId = new Types.ObjectId().toString();
      const run = await RunService.create({
        project: projectId,
        name: "Run 1",
        sessions: [],
        annotationType: "PER_UTTERANCE",
        prompt: promptId,
        promptVersion: 1,
        modelCode: testModel,
        shouldRunVerification: false,
        createdBy: new Types.ObjectId().toString(),
      });
      const runSet = await RunSetService.create({
        name: "Test RunSet",
        project: projectId,
        sessions: [sessionId],
        runs: [run._id],
        annotationType: "PER_UTTERANCE",
      });

      const result = await RunSetService.getPrefillDataFromRunSet(
        runSet._id,
        projectId,
      );

      expect(result.prefillData).not.toBeNull();
      expect(result.prefillData!.sourceRunSetId).toBe(runSet._id);
      expect(result.prefillData!.sourceRunSetName).toBe("Test RunSet");
      expect(result.prefillData!.selectedPrompts).toHaveLength(1);
      expect(result.prefillData!.selectedPrompts[0].promptId).toBe(promptId);
      expect(result.prefillData!.selectedPrompts[0].promptName).toBe(
        "Test Prompt",
      );
      expect(result.prefillData!.selectedModels).toContain(testModel);
      expect(result.prefillData!.validationErrors).toBeUndefined();
      expect(result.prefillSessionIds).toContain(sessionId);
    });

    it("deduplicates runs that share the same prompt+version", async () => {
      const run1 = await RunService.create({
        project: projectId,
        name: "Run 1",
        sessions: [],
        annotationType: "PER_UTTERANCE",
        prompt: promptId,
        promptVersion: 1,
        modelCode: testModel,
        shouldRunVerification: false,
        createdBy: new Types.ObjectId().toString(),
      });
      const run2 = await RunService.create({
        project: projectId,
        name: "Run 2",
        sessions: [],
        annotationType: "PER_UTTERANCE",
        prompt: promptId,
        promptVersion: 1,
        modelCode: testModel,
        shouldRunVerification: false,
        createdBy: new Types.ObjectId().toString(),
      });
      const runSet = await RunSetService.create({
        name: "Dedup RunSet",
        project: projectId,
        runs: [run1._id, run2._id],
        annotationType: "PER_UTTERANCE",
      });

      const result = await RunSetService.getPrefillDataFromRunSet(
        runSet._id,
        projectId,
      );

      expect(result.prefillData!.selectedPrompts).toHaveLength(1);
      expect(result.prefillData!.selectedModels).toHaveLength(1);
    });

    it("includes validation error when a prompt no longer exists", async () => {
      const run = await RunService.create({
        project: projectId,
        name: "Run",
        sessions: [],
        annotationType: "PER_UTTERANCE",
        prompt: promptId,
        promptVersion: 1,
        modelCode: testModel,
        shouldRunVerification: false,
        createdBy: new Types.ObjectId().toString(),
      });
      const deletedId = new Types.ObjectId().toString();
      await RunService.updateById(run._id, { prompt: deletedId });
      const runSet = await RunSetService.create({
        name: "RunSet",
        project: projectId,
        runs: [run._id],
        annotationType: "PER_UTTERANCE",
      });

      const result = await RunSetService.getPrefillDataFromRunSet(
        runSet._id,
        projectId,
      );

      expect(result.prefillData!.validationErrors).toEqual(
        expect.arrayContaining([expect.stringContaining("no longer exists")]),
      );
    });

    it("skips human runs when building prompt and model selections", async () => {
      const llmRun = await RunService.create({
        project: projectId,
        name: "LLM Run",
        sessions: [],
        annotationType: "PER_UTTERANCE",
        prompt: promptId,
        promptVersion: 1,
        modelCode: testModel,
        shouldRunVerification: false,
        createdBy: new Types.ObjectId().toString(),
      });
      const humanRun = await RunService.createFromData({
        project: projectId,
        name: "Human Run",
        annotationType: "PER_UTTERANCE",
        isHuman: true,
        annotator: { name: "Alice" },
        sessions: [],
        snapshot: {
          prompt: {
            name: "Human Annotation",
            userPrompt: "",
            annotationSchema: [],
            annotationType: "PER_UTTERANCE",
            version: 1,
          },
        },
      });
      const runSet = await RunSetService.create({
        name: "Mixed RunSet",
        project: projectId,
        runs: [llmRun._id, humanRun._id],
        annotationType: "PER_UTTERANCE",
      });

      const result = await RunSetService.getPrefillDataFromRunSet(
        runSet._id,
        projectId,
      );

      expect(result.prefillData!.selectedPrompts).toHaveLength(1);
      expect(result.prefillData!.selectedPrompts[0].promptId).toBe(promptId);
      expect(result.prefillData!.selectedModels).toContain(testModel);
      expect(result.prefillData!.validationErrors).toBeUndefined();
    });

    it("includes validation error when all runs are human-annotated", async () => {
      const humanRun = await RunService.createFromData({
        project: projectId,
        name: "Human Run",
        annotationType: "PER_UTTERANCE",
        isHuman: true,
        annotator: { name: "Alice" },
        sessions: [],
        snapshot: {
          prompt: {
            name: "Human Annotation",
            userPrompt: "",
            annotationSchema: [],
            annotationType: "PER_UTTERANCE",
            version: 1,
          },
        },
      });
      const runSet = await RunSetService.create({
        name: "Human-only RunSet",
        project: projectId,
        runs: [humanRun._id],
        annotationType: "PER_UTTERANCE",
      });

      const result = await RunSetService.getPrefillDataFromRunSet(
        runSet._id,
        projectId,
      );

      expect(result.prefillData).not.toBeNull();
      expect(result.prefillData!.validationErrors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("all runs are human-annotated"),
        ]),
      );
      expect(result.prefillData!.selectedPrompts).toHaveLength(0);
      expect(result.prefillData!.selectedModels).toHaveLength(0);
    });

    it("copies shouldRunVerification when any run has it enabled", async () => {
      const runWithout = await RunService.create({
        project: projectId,
        name: "Run Without Verification",
        sessions: [],
        annotationType: "PER_UTTERANCE",
        prompt: promptId,
        promptVersion: 1,
        modelCode: testModel,
        shouldRunVerification: false,
        createdBy: new Types.ObjectId().toString(),
      });
      const runWith = await RunService.create({
        project: projectId,
        name: "Run With Verification",
        sessions: [],
        annotationType: "PER_UTTERANCE",
        prompt: promptId,
        promptVersion: 1,
        modelCode: testModel,
        shouldRunVerification: true,
        createdBy: new Types.ObjectId().toString(),
      });
      const runSet = await RunSetService.create({
        name: "Mixed Verification RunSet",
        project: projectId,
        runs: [runWithout._id, runWith._id],
        annotationType: "PER_UTTERANCE",
      });

      const result = await RunSetService.getPrefillDataFromRunSet(
        runSet._id,
        projectId,
      );

      expect(result.prefillData!.shouldRunVerification).toBe(true);
    });

    it("keeps shouldRunVerification false when no runs have it enabled", async () => {
      const run = await RunService.create({
        project: projectId,
        name: "Run Without Verification",
        sessions: [],
        annotationType: "PER_UTTERANCE",
        prompt: promptId,
        promptVersion: 1,
        modelCode: testModel,
        shouldRunVerification: false,
        createdBy: new Types.ObjectId().toString(),
      });
      const runSet = await RunSetService.create({
        name: "No Verification RunSet",
        project: projectId,
        runs: [run._id],
        annotationType: "PER_UTTERANCE",
      });

      const result = await RunSetService.getPrefillDataFromRunSet(
        runSet._id,
        projectId,
      );

      expect(result.prefillData!.shouldRunVerification).toBe(false);
    });

    it("includes validation error when a model is no longer available", async () => {
      const run = await RunService.create({
        project: projectId,
        name: "Run",
        sessions: [],
        annotationType: "PER_UTTERANCE",
        prompt: promptId,
        promptVersion: 1,
        modelCode: testModel,
        shouldRunVerification: false,
        createdBy: new Types.ObjectId().toString(),
      });
      await RunService.updateById(run._id, {
        snapshot: {
          ...run.snapshot,
          model: {
            code: "DEPRECATED_MODEL_XYZ",
            provider: "openai",
            name: "Deprecated",
          },
        },
      });
      const runSet = await RunSetService.create({
        name: "RunSet",
        project: projectId,
        runs: [run._id],
        annotationType: "PER_UTTERANCE",
      });

      const result = await RunSetService.getPrefillDataFromRunSet(
        runSet._id,
        projectId,
      );

      expect(result.prefillData!.validationErrors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("no longer available"),
        ]),
      );
    });
  });
});
