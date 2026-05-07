import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectService } from "~/modules/projects/project";
import { PromptService } from "~/modules/prompts/prompt";
import { PromptVersionService } from "~/modules/prompts/promptVersion";
import { TeamService } from "~/modules/teams/team";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import createTestRun from "../../../../test/helpers/createTestRun";
import createRunAnnotations from "../services/createRunAnnotations.server";

describe("createRunAnnotations", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  it("throws error if project not found", async () => {
    const team = await TeamService.create({ name: "team 1" });
    const prompt = await PromptService.create({
      name: "Test Prompt",
      annotationType: "PER_UTTERANCE",
      team: team._id,
    });

    const invalidProjectId = "507f1f77bcf86cd799439011";
    const run = await createTestRun({
      name: "Test Run",
      project: invalidProjectId as any,
      annotationType: "PER_UTTERANCE",
      prompt: prompt._id,
      promptVersion: 1,
      sessions: [],
      isRunning: false,
      isComplete: false,
      hasErrored: false,
      isExporting: false,
    });

    await expect(
      createRunAnnotations(run, undefined, "user-123"),
    ).rejects.toThrow(`Project not found: ${invalidProjectId}`);
  });

  it("throws error if prompt version not found", async () => {
    const team = await TeamService.create({ name: "team 1" });
    const project = await ProjectService.create({
      name: "Test Project",
      team: team._id,
    });

    const prompt = await PromptService.create({
      name: "Test Prompt",
      annotationType: "PER_UTTERANCE",
      team: team._id,
    });

    const run = await createTestRun({
      name: "Test Run",
      project: project._id,
      annotationType: "PER_UTTERANCE",
      prompt: prompt._id,
      promptVersion: 1,
      sessions: [],
      isRunning: false,
      isComplete: false,
      hasErrored: false,
      isExporting: false,
    });

    await expect(
      createRunAnnotations(run, undefined, "user-123"),
    ).rejects.toThrow("Prompt version not found");
  });

  it("returns early if run is already running", async () => {
    const team = await TeamService.create({ name: "team 1" });
    const project = await ProjectService.create({
      name: "Test Project",
      team: team._id,
    });

    const prompt = await PromptService.create({
      name: "Test Prompt",
      annotationType: "PER_UTTERANCE",
      team: team._id,
    });

    const run = await createTestRun({
      name: "Test Run",
      project: project._id,
      annotationType: "PER_UTTERANCE",
      prompt: prompt._id,
      promptVersion: 1,
      sessions: [],
      isRunning: true,
      isComplete: false,
      hasErrored: false,
      isExporting: false,
    });

    await expect(
      createRunAnnotations(run, undefined, "user-123"),
    ).resolves.toBeUndefined();
  });

  it("successfully processes a run with valid data", async () => {
    const team = await TeamService.create({ name: "team 1" });
    const project = await ProjectService.create({
      name: "Test Project",
      team: team._id,
    });

    const prompt = await PromptService.create({
      name: "Test Prompt",
      annotationType: "PER_UTTERANCE",
      team: team._id,
    });

    await PromptVersionService.create({
      name: "Version 1",
      prompt: prompt._id,
      version: 1,
      userPrompt: "Analyze this",
      annotationSchema: [
        {
          isSystem: true,
          fieldKey: "_id",
          fieldType: "string",
          value: "",
        },
      ],
    });

    const run = await createTestRun({
      name: "Test Run",
      project: project._id,
      annotationType: "PER_UTTERANCE",
      prompt: prompt._id,
      promptVersion: 1,
      sessions: [],
      isRunning: false,
      isComplete: false,
      hasErrored: false,
      isExporting: false,
    });

    vi.doMock("~/modules/queues/helpers/taskSequencer");

    await expect(
      createRunAnnotations(run, undefined, "user-123"),
    ).resolves.toBeUndefined();
  });
});
