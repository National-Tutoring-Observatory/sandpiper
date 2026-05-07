import { beforeEach, describe, expect, it, vi } from "vitest";
import { BillingPlanService } from "~/modules/billing/billingPlan";
import { TeamBillingService } from "~/modules/billing/teamBilling";
import { getAvailableProviders } from "~/modules/llm/modelRegistry";
import { ProjectService } from "~/modules/projects/project";
import type { Project } from "~/modules/projects/projects.types";
import { PromptService } from "~/modules/prompts/prompt";
import { PromptVersionService } from "~/modules/prompts/promptVersion";
import { RunService } from "~/modules/runs/run";
import { SessionService } from "~/modules/sessions/session";
import type { Session } from "~/modules/sessions/sessions.types";
import { TeamService } from "~/modules/teams/team";
import { UserService } from "~/modules/users/user";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import createTestRun from "../../../../test/helpers/createTestRun";
import { buildUsedPromptModelKey } from "../helpers/getUsedPromptModels";
import { RunSetService } from "../runSet";
import type { RunDefinition } from "../runSets.types";

const providers = getAvailableProviders();
const testModel1 = providers[0].models[0].code;
const testModel2 = providers[0].models[1].code;

vi.mock("~/modules/runs/services/createRunAnnotations.server", () => ({
  default: vi.fn(async () => {}),
}));

function buildDefinition(
  promptId: string,
  promptName: string,
  version: number,
  modelCode: string,
): RunDefinition {
  return {
    key: buildUsedPromptModelKey(promptId, version, modelCode),
    prompt: { promptId, promptName, version },
    modelCode,
  };
}

describe("RunSetService", () => {
  let project: Project;
  let session1: Session;
  let session2: Session;
  let testUserId: string;

  beforeEach(async () => {
    await clearDocumentDB();

    const user = await UserService.create({ username: "test_user", teams: [] });
    testUserId = user._id;
    const team = await TeamService.create({ name: "Test Team" });
    await UserService.updateById(user._id, {
      teams: [{ team: team._id, role: "ADMIN" }],
    });

    project = await ProjectService.create({
      name: "Test Project",
      createdBy: user._id,
      team: team._id,
    });

    await BillingPlanService.create({
      name: "Default",
      markupRate: 1.5,
      isDefault: true,
    });
    await TeamBillingService.setupTeamBilling(team._id);
    await TeamBillingService.assignInitialCredits(team._id, user._id);

    session1 = await SessionService.create({
      name: "Session 1",
      project: project._id,
    });
    session2 = await SessionService.create({
      name: "Session 2",
      project: project._id,
    });
  });

  describe("createWithRuns", () => {
    let prompt1: any;

    beforeEach(async () => {
      prompt1 = await PromptService.create({
        name: "Prompt 1",
        annotationType: "PER_UTTERANCE",
      });
      await PromptVersionService.create({
        prompt: prompt1._id,
        version: 1,
        userPrompt: "Test prompt 1",
        annotationSchema: [],
      });
    });

    it("creates runSet with runs from explicit definitions", async () => {
      const result = await RunSetService.createWithRuns({
        project: project._id,
        name: "Test Run Set",
        sessions: [session1._id, session2._id],
        definitions: [buildDefinition(prompt1._id, "Prompt 1", 1, testModel1)],
        annotationType: "PER_UTTERANCE",
        userId: testUserId,
      });

      expect(result).toHaveProperty("runSet");
      expect(result).toHaveProperty("errors");
      expect(result.runSet.name).toBe("Test Run Set");
      expect(result.runSet.project).toBe(project._id);
      expect(result.runSet.annotationType).toBe("PER_UTTERANCE");
      expect(Array.isArray(result.runSet.runs)).toBe(true);
      expect(result.runSet.runs).toHaveLength(1);
    });

    it("creates only runs for provided definitions", async () => {
      const result = await RunSetService.createWithRuns({
        project: project._id,
        name: "Test Run Set",
        sessions: [session1._id, session2._id],
        definitions: [buildDefinition(prompt1._id, "Prompt 1", 1, testModel1)],
        annotationType: "PER_UTTERANCE",
        userId: testUserId,
      });

      expect(result.runSet.runs).toHaveLength(1);
      expect(result.errors).toEqual([]);
    });
  });

  describe("createRunsForRunSet", () => {
    let prompt1: any;
    let runSetId: string;

    beforeEach(async () => {
      prompt1 = await PromptService.create({
        name: "Prompt 1",
        annotationType: "PER_UTTERANCE",
      });
      await PromptVersionService.create({
        prompt: prompt1._id,
        version: 1,
        userPrompt: "Test prompt 1",
        annotationSchema: [],
      });

      const runSet = await RunSetService.create({
        name: "Test Run Set",
        project: project._id,
        sessions: [session1._id, session2._id],
        runs: [],
        annotationType: "PER_UTTERANCE",
      });
      runSetId = runSet._id;
    });

    it("returns null runSet when runSet not found", async () => {
      const result = await RunSetService.createRunsForRunSet({
        runSetId: "000000000000000000000000",
        definitions: [buildDefinition(prompt1._id, "Prompt 1", 1, testModel1)],
        userId: testUserId,
      });

      expect(result.runSet).toBeNull();
      expect(result.errors).toContain("Run set not found");
      expect(result.createdRunIds).toEqual([]);
    });

    it("creates runs from explicit definitions", async () => {
      const result = await RunSetService.createRunsForRunSet({
        runSetId,
        definitions: [buildDefinition(prompt1._id, "Prompt 1", 1, testModel1)],
        userId: testUserId,
      });

      expect(result.runSet).not.toBeNull();
      expect(result.createdRunIds).toHaveLength(1);
      expect(result.errors).toEqual([]);

      const updatedRunSet = await RunSetService.findById(runSetId);
      expect(updatedRunSet!.runs).toContain(result.createdRunIds[0]);
    });

    it("only creates runs for provided definitions, not full Cartesian product", async () => {
      const result = await RunSetService.createRunsForRunSet({
        runSetId,
        definitions: [buildDefinition(prompt1._id, "Prompt 1", 1, testModel1)],
        userId: testUserId,
      });

      expect(result.createdRunIds).toHaveLength(1);
    });

    it("skips duplicate prompt/model combinations", async () => {
      const existingRun = await RunService.create({
        project: project._id,
        name: "Existing Run",
        sessions: [session1._id, session2._id],
        annotationType: "PER_UTTERANCE",
        prompt: prompt1._id,
        promptVersion: 1,
        modelCode: testModel1,
        shouldRunVerification: false,
        createdBy: testUserId,
      });

      await RunSetService.updateById(runSetId, {
        runs: [existingRun._id],
      });

      const result = await RunSetService.createRunsForRunSet({
        runSetId,
        definitions: [buildDefinition(prompt1._id, "Prompt 1", 1, testModel1)],
        userId: testUserId,
      });

      expect(result.runSet).not.toBeNull();
      expect(result.createdRunIds).toEqual([]);
    });

    it("creates only new combinations when mix of new and duplicate", async () => {
      const existingRun = await RunService.create({
        project: project._id,
        name: "Existing Run",
        sessions: [session1._id, session2._id],
        annotationType: "PER_UTTERANCE",
        prompt: prompt1._id,
        promptVersion: 1,
        modelCode: testModel1,
        shouldRunVerification: false,
        createdBy: testUserId,
      });

      await RunSetService.updateById(runSetId, {
        runs: [existingRun._id],
      });

      const result = await RunSetService.createRunsForRunSet({
        runSetId,
        definitions: [
          buildDefinition(prompt1._id, "Prompt 1", 1, testModel1),
          buildDefinition(prompt1._id, "Prompt 1", 1, testModel2),
        ],
        userId: testUserId,
      });

      expect(result.runSet).not.toBeNull();
      expect(result.createdRunIds).toHaveLength(1);

      const updatedRunSet = await RunSetService.findById(runSetId);
      expect(updatedRunSet!.runs).toContain(existingRun._id);
      expect(updatedRunSet!.runs).toContain(result.createdRunIds[0]);
    });

    it("adds created run IDs to runSet", async () => {
      const result = await RunSetService.createRunsForRunSet({
        runSetId,
        definitions: [
          buildDefinition(prompt1._id, "Prompt 1", 1, testModel1),
          buildDefinition(prompt1._id, "Prompt 1", 1, testModel2),
        ],
        userId: testUserId,
      });

      expect(result.createdRunIds).toHaveLength(2);

      const updatedRunSet = await RunSetService.findById(runSetId);
      for (const runId of result.createdRunIds) {
        expect(updatedRunSet!.runs).toContain(runId);
      }
    });
  });

  describe("findEligibleRunsForRunSet", () => {
    let project2: Project;
    let session3: Session;

    beforeEach(async () => {
      project2 = await ProjectService.create({
        name: "Other Project",
        createdBy: project.createdBy,
        team: project.team,
      });
      session3 = await SessionService.create({
        name: "Session 3",
        project: project._id,
      });
    });

    describe("project invariant", () => {
      it("excludes runs from different projects", async () => {
        const runSet = await RunSetService.create({
          name: "Test Run Set",
          project: project._id,
          sessions: [session1._id, session2._id],
          runs: [],
          annotationType: "PER_UTTERANCE",
        });

        await createTestRun({
          name: "Run from other project",
          project: project2._id,
          annotationType: "PER_UTTERANCE",
          sessions: [
            {
              sessionId: session1._id,
              status: "DONE",
              name: "Session 1",
              fileType: "json",
              startedAt: new Date(),
              finishedAt: new Date(),
            },
            {
              sessionId: session2._id,
              status: "DONE",
              name: "Session 2",
              fileType: "json",
              startedAt: new Date(),
              finishedAt: new Date(),
            },
          ],
        });

        const result = await RunSetService.findEligibleRunsForRunSet(
          runSet._id,
        );

        expect(result.data).toHaveLength(0);
      });

      it("includes runs from same project", async () => {
        const runSet = await RunSetService.create({
          name: "Test Run Set",
          project: project._id,
          sessions: [session1._id, session2._id],
          runs: [],
          annotationType: "PER_UTTERANCE",
        });

        const run = await createTestRun({
          name: "Run from same project",
          project: project._id,
          annotationType: "PER_UTTERANCE",
          sessions: [
            {
              sessionId: session1._id,
              status: "DONE",
              name: "Session 1",
              fileType: "json",
              startedAt: new Date(),
              finishedAt: new Date(),
            },
            {
              sessionId: session2._id,
              status: "DONE",
              name: "Session 2",
              fileType: "json",
              startedAt: new Date(),
              finishedAt: new Date(),
            },
          ],
        });

        const result = await RunSetService.findEligibleRunsForRunSet(
          runSet._id,
        );

        expect(result.data).toHaveLength(1);
        expect(result.data[0]._id).toBe(run._id);
      });
    });

    describe("annotation type invariant", () => {
      it("only includes runs with matching annotation type", async () => {
        const runSet = await RunSetService.create({
          name: "Run Set",
          project: project._id,
          sessions: [session1._id],
          runs: [],
          annotationType: "PER_UTTERANCE",
        });

        const matchingRun = await createTestRun({
          name: "Matching annotation type",
          project: project._id,
          annotationType: "PER_UTTERANCE",
          sessions: [
            {
              sessionId: session1._id,
              status: "DONE",
              name: "Session 1",
              fileType: "json",
              startedAt: new Date(),
              finishedAt: new Date(),
            },
          ],
        });

        await createTestRun({
          name: "Non-matching annotation type",
          project: project._id,
          annotationType: "PER_SESSION",
          sessions: [
            {
              sessionId: session1._id,
              status: "DONE",
              name: "Session 1",
              fileType: "json",
              startedAt: new Date(),
              finishedAt: new Date(),
            },
          ],
        });

        const result = await RunSetService.findEligibleRunsForRunSet(
          runSet._id,
        );

        expect(result.data).toHaveLength(1);
        expect(result.data[0]._id).toBe(matchingRun._id);
      });
    });

    describe("sessions invariant", () => {
      it("excludes runs with different sessions", async () => {
        const runSet = await RunSetService.create({
          name: "Test Run Set",
          project: project._id,
          sessions: [session1._id, session2._id],
          runs: [],
          annotationType: "PER_UTTERANCE",
        });

        await createTestRun({
          name: "Run with different sessions",
          project: project._id,
          annotationType: "PER_UTTERANCE",
          sessions: [
            {
              sessionId: session1._id,
              status: "DONE",
              name: "Session 1",
              fileType: "json",
              startedAt: new Date(),
              finishedAt: new Date(),
            },
            {
              sessionId: session3._id,
              status: "DONE",
              name: "Session 3",
              fileType: "json",
              startedAt: new Date(),
              finishedAt: new Date(),
            },
          ],
        });

        const result = await RunSetService.findEligibleRunsForRunSet(
          runSet._id,
        );

        expect(result.data).toHaveLength(0);
      });

      it("includes runs with same sessions in different order", async () => {
        const runSet = await RunSetService.create({
          name: "Test Run Set",
          project: project._id,
          sessions: [session1._id, session2._id],
          runs: [],
          annotationType: "PER_UTTERANCE",
        });

        const run = await createTestRun({
          name: "Run with same sessions different order",
          project: project._id,
          annotationType: "PER_UTTERANCE",
          sessions: [
            {
              sessionId: session2._id,
              status: "DONE",
              name: "Session 2",
              fileType: "json",
              startedAt: new Date(),
              finishedAt: new Date(),
            },
            {
              sessionId: session1._id,
              status: "DONE",
              name: "Session 1",
              fileType: "json",
              startedAt: new Date(),
              finishedAt: new Date(),
            },
          ],
        });

        const result = await RunSetService.findEligibleRunsForRunSet(
          runSet._id,
        );

        expect(result.data).toHaveLength(1);
        expect(result.data[0]._id).toBe(run._id);
      });

      it("excludes runs with subset of sessions", async () => {
        const runSet = await RunSetService.create({
          name: "Test Run Set",
          project: project._id,
          sessions: [session1._id, session2._id],
          runs: [],
          annotationType: "PER_UTTERANCE",
        });

        await createTestRun({
          name: "Run with subset of sessions",
          project: project._id,
          annotationType: "PER_UTTERANCE",
          sessions: [
            {
              sessionId: session1._id,
              status: "DONE",
              name: "Session 1",
              fileType: "json",
              startedAt: new Date(),
              finishedAt: new Date(),
            },
          ],
        });

        const result = await RunSetService.findEligibleRunsForRunSet(
          runSet._id,
        );

        expect(result.data).toHaveLength(0);
      });

      it("excludes runs with superset of sessions", async () => {
        const runSet = await RunSetService.create({
          name: "Test Run Set",
          project: project._id,
          sessions: [session1._id],
          runs: [],
          annotationType: "PER_UTTERANCE",
        });

        await createTestRun({
          name: "Run with superset of sessions",
          project: project._id,
          annotationType: "PER_UTTERANCE",
          sessions: [
            {
              sessionId: session1._id,
              status: "DONE",
              name: "Session 1",
              fileType: "json",
              startedAt: new Date(),
              finishedAt: new Date(),
            },
            {
              sessionId: session2._id,
              status: "DONE",
              name: "Session 2",
              fileType: "json",
              startedAt: new Date(),
              finishedAt: new Date(),
            },
          ],
        });

        const result = await RunSetService.findEligibleRunsForRunSet(
          runSet._id,
        );

        expect(result.data).toHaveLength(0);
      });
    });

    describe("duplicates", () => {
      it("excludes runs already in runSet", async () => {
        const existingRun = await createTestRun({
          name: "Existing Run",
          project: project._id,
          annotationType: "PER_UTTERANCE",
          sessions: [
            {
              sessionId: session1._id,
              status: "DONE",
              name: "Session 1",
              fileType: "json",
              startedAt: new Date(),
              finishedAt: new Date(),
            },
          ],
        });

        const runSet = await RunSetService.create({
          name: "Test Run Set",
          project: project._id,
          sessions: [session1._id],
          runs: [existingRun._id],
          annotationType: "PER_UTTERANCE",
        });

        const newRun = await createTestRun({
          name: "New Run",
          project: project._id,
          annotationType: "PER_UTTERANCE",
          sessions: [
            {
              sessionId: session1._id,
              status: "DONE",
              name: "Session 1",
              fileType: "json",
              startedAt: new Date(),
              finishedAt: new Date(),
            },
          ],
        });

        const result = await RunSetService.findEligibleRunsForRunSet(
          runSet._id,
        );

        expect(result.data).toHaveLength(1);
        expect(result.data[0]._id).toBe(newRun._id);
      });
    });

    describe("pagination", () => {
      it("returns paginated results", async () => {
        const runSet = await RunSetService.create({
          name: "Test Run Set",
          project: project._id,
          sessions: [session1._id],
          runs: [],
          annotationType: "PER_UTTERANCE",
        });

        for (let i = 0; i < 5; i++) {
          await createTestRun({
            name: `Run ${i}`,
            project: project._id,
            annotationType: "PER_UTTERANCE",
            sessions: [
              {
                sessionId: session1._id,
                status: "DONE",
                name: "Session 1",
                fileType: "json",
                startedAt: new Date(),
                finishedAt: new Date(),
              },
            ],
          });
        }

        const page1 = await RunSetService.findEligibleRunsForRunSet(
          runSet._id,
          { page: 1, pageSize: 3 },
        );
        const page2 = await RunSetService.findEligibleRunsForRunSet(
          runSet._id,
          { page: 2, pageSize: 3 },
        );

        expect(page1.data).toHaveLength(3);
        expect(page1.count).toBe(5);
        expect(page1.totalPages).toBe(2);

        expect(page2.data).toHaveLength(2);
        expect(page2.count).toBe(5);
        expect(page2.totalPages).toBe(2);
      });
    });
  });

  describe("addRunsToRunSet", () => {
    let project2: Project;

    beforeEach(async () => {
      project2 = await ProjectService.create({
        name: "Other Project",
        createdBy: project.createdBy,
        team: project.team,
      });
    });

    it("adds valid runs to runSet", async () => {
      const runSet = await RunSetService.create({
        name: "Test Run Set",
        project: project._id,
        sessions: [session1._id],
        runs: [],
        annotationType: "PER_UTTERANCE",
      });

      const run1 = await createTestRun({
        name: "Run 1",
        project: project._id,
        annotationType: "PER_UTTERANCE",
        sessions: [
          {
            sessionId: session1._id,
            status: "DONE",
            name: "Session 1",
            fileType: "json",
            startedAt: new Date(),
            finishedAt: new Date(),
          },
        ],
      });

      const run2 = await createTestRun({
        name: "Run 2",
        project: project._id,
        annotationType: "PER_UTTERANCE",
        sessions: [
          {
            sessionId: session1._id,
            status: "DONE",
            name: "Session 1",
            fileType: "json",
            startedAt: new Date(),
            finishedAt: new Date(),
          },
        ],
      });

      const result = await RunSetService.addRunsToRunSet(runSet._id, [
        run1._id,
        run2._id,
      ]);

      expect(result.added).toHaveLength(2);
      expect(result.added).toContain(run1._id);
      expect(result.added).toContain(run2._id);
      expect(result.skipped).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(result.runSet.runs).toHaveLength(2);
    });

    it("skips runs already in runSet", async () => {
      const existingRun = await createTestRun({
        name: "Existing Run",
        project: project._id,
        annotationType: "PER_UTTERANCE",
        sessions: [
          {
            sessionId: session1._id,
            status: "DONE",
            name: "Session 1",
            fileType: "json",
            startedAt: new Date(),
            finishedAt: new Date(),
          },
        ],
      });

      const runSet = await RunSetService.create({
        name: "Test Run Set",
        project: project._id,
        sessions: [session1._id],
        runs: [existingRun._id],
        annotationType: "PER_UTTERANCE",
      });

      const newRun = await createTestRun({
        name: "New Run",
        project: project._id,
        annotationType: "PER_UTTERANCE",
        sessions: [
          {
            sessionId: session1._id,
            status: "DONE",
            name: "Session 1",
            fileType: "json",
            startedAt: new Date(),
            finishedAt: new Date(),
          },
        ],
      });

      const result = await RunSetService.addRunsToRunSet(runSet._id, [
        existingRun._id,
        newRun._id,
      ]);

      expect(result.added).toHaveLength(1);
      expect(result.added).toContain(newRun._id);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped).toContain(existingRun._id);
      expect(result.errors).toHaveLength(0);
    });

    it("returns error for runs that fail invariants", async () => {
      const runSet = await RunSetService.create({
        name: "Test Run Set",
        project: project._id,
        sessions: [session1._id],
        runs: [],
        annotationType: "PER_UTTERANCE",
      });

      const invalidRun = await createTestRun({
        name: "Invalid Run - wrong sessions",
        project: project._id,
        annotationType: "PER_UTTERANCE",
        sessions: [
          {
            sessionId: session1._id,
            status: "DONE",
            name: "Session 1",
            fileType: "json",
            startedAt: new Date(),
            finishedAt: new Date(),
          },
          {
            sessionId: session2._id,
            status: "DONE",
            name: "Session 2",
            fileType: "json",
            startedAt: new Date(),
            finishedAt: new Date(),
          },
        ],
      });

      const result = await RunSetService.addRunsToRunSet(runSet._id, [
        invalidRun._id,
      ]);

      expect(result.added).toHaveLength(0);
      expect(result.skipped).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain(invalidRun._id);
    });

    it("handles mixed valid and invalid runs", async () => {
      const runSet = await RunSetService.create({
        name: "Test Run Set",
        project: project._id,
        sessions: [session1._id],
        runs: [],
        annotationType: "PER_UTTERANCE",
      });

      const validRun = await createTestRun({
        name: "Valid Run",
        project: project._id,
        annotationType: "PER_UTTERANCE",
        sessions: [
          {
            sessionId: session1._id,
            status: "DONE",
            name: "Session 1",
            fileType: "json",
            startedAt: new Date(),
            finishedAt: new Date(),
          },
        ],
      });

      const invalidRun = await createTestRun({
        name: "Invalid Run - wrong project",
        project: project2._id,
        annotationType: "PER_UTTERANCE",
        sessions: [
          {
            sessionId: session1._id,
            status: "DONE",
            name: "Session 1",
            fileType: "json",
            startedAt: new Date(),
            finishedAt: new Date(),
          },
        ],
      });

      const result = await RunSetService.addRunsToRunSet(runSet._id, [
        validRun._id,
        invalidRun._id,
      ]);

      expect(result.added).toHaveLength(1);
      expect(result.added).toContain(validRun._id);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain(invalidRun._id);
      expect(result.runSet.runs).toHaveLength(1);
    });
  });

  describe("findMergeableRunSets", () => {
    let project2: Project;
    let session3: Session;

    beforeEach(async () => {
      project2 = await ProjectService.create({
        name: "Other Project",
        createdBy: project.createdBy,
        team: project.team,
      });
      session3 = await SessionService.create({
        name: "Session 3",
        project: project._id,
      });
    });

    it("returns runSets from same project with same sessions", async () => {
      const targetRunSet = await RunSetService.create({
        name: "Target RunSet",
        project: project._id,
        sessions: [session1._id, session2._id],
        runs: [],
        annotationType: "PER_UTTERANCE",
      });

      const mergeableRunSet = await RunSetService.create({
        name: "Mergeable RunSet",
        project: project._id,
        sessions: [session1._id, session2._id],
        runs: [],
        annotationType: "PER_UTTERANCE",
      });

      const result = await RunSetService.findMergeableRunSets(targetRunSet._id);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]._id).toBe(mergeableRunSet._id);
    });

    it("excludes runSets from different projects", async () => {
      const targetRunSet = await RunSetService.create({
        name: "Target RunSet",
        project: project._id,
        sessions: [session1._id],
        runs: [],
        annotationType: "PER_UTTERANCE",
      });

      await RunSetService.create({
        name: "Other Project RunSet",
        project: project2._id,
        sessions: [session1._id],
        runs: [],
        annotationType: "PER_UTTERANCE",
      });

      const result = await RunSetService.findMergeableRunSets(targetRunSet._id);

      expect(result.data).toHaveLength(0);
    });

    it("excludes runSets with different sessions", async () => {
      const targetRunSet = await RunSetService.create({
        name: "Target RunSet",
        project: project._id,
        sessions: [session1._id, session2._id],
        runs: [],
        annotationType: "PER_UTTERANCE",
      });

      await RunSetService.create({
        name: "Different Sessions RunSet",
        project: project._id,
        sessions: [session1._id, session3._id],
        runs: [],
        annotationType: "PER_UTTERANCE",
      });

      const result = await RunSetService.findMergeableRunSets(targetRunSet._id);

      expect(result.data).toHaveLength(0);
    });

    it("excludes runSets with incompatible annotation types", async () => {
      const targetRun = await createTestRun({
        name: "Target Run",
        project: project._id,
        annotationType: "PER_UTTERANCE",
        sessions: [
          {
            sessionId: session1._id,
            status: "DONE",
            name: "Session 1",
            fileType: "json",
            startedAt: new Date(),
            finishedAt: new Date(),
          },
        ],
      });

      const targetRunSet = await RunSetService.create({
        name: "Target RunSet",
        project: project._id,
        sessions: [session1._id],
        runs: [targetRun._id],
        annotationType: "PER_UTTERANCE",
      });

      const incompatibleRun = await createTestRun({
        name: "Incompatible Run",
        project: project._id,
        annotationType: "PER_SESSION",
        sessions: [
          {
            sessionId: session1._id,
            status: "DONE",
            name: "Session 1",
            fileType: "json",
            startedAt: new Date(),
            finishedAt: new Date(),
          },
        ],
      });

      await RunSetService.create({
        name: "Incompatible RunSet",
        project: project._id,
        sessions: [session1._id],
        runs: [incompatibleRun._id],
        annotationType: "PER_SESSION",
      });

      const result = await RunSetService.findMergeableRunSets(targetRunSet._id);

      expect(result.data).toHaveLength(0);
    });

    it("excludes the target runSet itself", async () => {
      const targetRunSet = await RunSetService.create({
        name: "Target RunSet",
        project: project._id,
        sessions: [session1._id],
        runs: [],
        annotationType: "PER_UTTERANCE",
      });

      const result = await RunSetService.findMergeableRunSets(targetRunSet._id);

      expect(result.data).toHaveLength(0);
      expect(result.data.map((c) => c._id)).not.toContain(targetRunSet._id);
    });

    it("only includes runSets with matching annotation type", async () => {
      const targetRunSet = await RunSetService.create({
        name: "Target RunSet",
        project: project._id,
        sessions: [session1._id],
        runs: [],
        annotationType: "PER_UTTERANCE",
      });

      const matchingRunSet = await RunSetService.create({
        name: "Matching RunSet",
        project: project._id,
        sessions: [session1._id],
        runs: [],
        annotationType: "PER_UTTERANCE",
      });

      await RunSetService.create({
        name: "Non-matching RunSet",
        project: project._id,
        sessions: [session1._id],
        runs: [],
        annotationType: "PER_SESSION",
      });

      const result = await RunSetService.findMergeableRunSets(targetRunSet._id);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]._id).toBe(matchingRunSet._id);
    });
  });

  describe("mergeRunSets", () => {
    it("merges runs from source into target", async () => {
      const targetRunSet = await RunSetService.create({
        name: "Target RunSet",
        project: project._id,
        sessions: [session1._id],
        runs: [],
        annotationType: "PER_UTTERANCE",
      });

      const sourceRun = await createTestRun({
        name: "Source Run",
        project: project._id,
        annotationType: "PER_UTTERANCE",
        sessions: [
          {
            sessionId: session1._id,
            status: "DONE",
            name: "Session 1",
            fileType: "json",
            startedAt: new Date(),
            finishedAt: new Date(),
          },
        ],
      });

      const sourceRunSet = await RunSetService.create({
        name: "Source RunSet",
        project: project._id,
        sessions: [session1._id],
        runs: [sourceRun._id],
        annotationType: "PER_UTTERANCE",
      });

      const result = await RunSetService.mergeRunSets(
        targetRunSet._id,
        sourceRunSet._id,
      );

      expect(result.added).toHaveLength(1);
      expect(result.added).toContain(sourceRun._id);
      expect(result.skipped).toHaveLength(0);
      expect(result.runSet.runs).toHaveLength(1);
      expect(result.runSet.runs).toContain(sourceRun._id);
    });

    it("skips duplicate runs", async () => {
      const existingRun = await createTestRun({
        name: "Existing Run",
        project: project._id,
        annotationType: "PER_UTTERANCE",
        sessions: [
          {
            sessionId: session1._id,
            status: "DONE",
            name: "Session 1",
            fileType: "json",
            startedAt: new Date(),
            finishedAt: new Date(),
          },
        ],
      });

      const targetRunSet = await RunSetService.create({
        name: "Target RunSet",
        project: project._id,
        sessions: [session1._id],
        runs: [existingRun._id],
        annotationType: "PER_UTTERANCE",
      });

      const newRun = await createTestRun({
        name: "New Run",
        project: project._id,
        annotationType: "PER_UTTERANCE",
        sessions: [
          {
            sessionId: session1._id,
            status: "DONE",
            name: "Session 1",
            fileType: "json",
            startedAt: new Date(),
            finishedAt: new Date(),
          },
        ],
      });

      const sourceRunSet = await RunSetService.create({
        name: "Source RunSet",
        project: project._id,
        sessions: [session1._id],
        runs: [existingRun._id, newRun._id],
        annotationType: "PER_UTTERANCE",
      });

      const result = await RunSetService.mergeRunSets(
        targetRunSet._id,
        sourceRunSet._id,
      );

      expect(result.added).toHaveLength(1);
      expect(result.added).toContain(newRun._id);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped).toContain(existingRun._id);
      expect(result.runSet.runs).toHaveLength(2);
    });

    it("keeps source runSet intact", async () => {
      const sourceRun = await createTestRun({
        name: "Source Run",
        project: project._id,
        annotationType: "PER_UTTERANCE",
        sessions: [
          {
            sessionId: session1._id,
            status: "DONE",
            name: "Session 1",
            fileType: "json",
            startedAt: new Date(),
            finishedAt: new Date(),
          },
        ],
      });

      const targetRunSet = await RunSetService.create({
        name: "Target RunSet",
        project: project._id,
        sessions: [session1._id],
        runs: [],
        annotationType: "PER_UTTERANCE",
      });

      const sourceRunSet = await RunSetService.create({
        name: "Source RunSet",
        project: project._id,
        sessions: [session1._id],
        runs: [sourceRun._id],
        annotationType: "PER_UTTERANCE",
      });

      await RunSetService.mergeRunSets(targetRunSet._id, sourceRunSet._id);

      const updatedSource = await RunSetService.findById(sourceRunSet._id);
      expect(updatedSource).not.toBeNull();
      expect(updatedSource!.runs).toHaveLength(1);
      expect(updatedSource!.runs).toContain(sourceRun._id);
    });

    it("throws error for incompatible runSets", async () => {
      const targetRunSet = await RunSetService.create({
        name: "Target RunSet",
        project: project._id,
        sessions: [session1._id],
        runs: [],
        annotationType: "PER_UTTERANCE",
      });

      const incompatibleRunSet = await RunSetService.create({
        name: "Incompatible RunSet",
        project: project._id,
        sessions: [session1._id],
        runs: [],
        annotationType: "PER_SESSION",
      });

      await expect(
        RunSetService.mergeRunSets(targetRunSet._id, incompatibleRunSet._id),
      ).rejects.toThrow("Run sets are not compatible for merging");
    });

    it("returns added and skipped counts", async () => {
      const existingRun = await createTestRun({
        name: "Existing Run",
        project: project._id,
        annotationType: "PER_UTTERANCE",
        sessions: [
          {
            sessionId: session1._id,
            status: "DONE",
            name: "Session 1",
            fileType: "json",
            startedAt: new Date(),
            finishedAt: new Date(),
          },
        ],
      });

      const targetRunSet = await RunSetService.create({
        name: "Target RunSet",
        project: project._id,
        sessions: [session1._id],
        runs: [existingRun._id],
        annotationType: "PER_UTTERANCE",
      });

      const newRun1 = await createTestRun({
        name: "New Run 1",
        project: project._id,
        annotationType: "PER_UTTERANCE",
        sessions: [
          {
            sessionId: session1._id,
            status: "DONE",
            name: "Session 1",
            fileType: "json",
            startedAt: new Date(),
            finishedAt: new Date(),
          },
        ],
      });

      const newRun2 = await createTestRun({
        name: "New Run 2",
        project: project._id,
        annotationType: "PER_UTTERANCE",
        sessions: [
          {
            sessionId: session1._id,
            status: "DONE",
            name: "Session 1",
            fileType: "json",
            startedAt: new Date(),
            finishedAt: new Date(),
          },
        ],
      });

      const sourceRunSet = await RunSetService.create({
        name: "Source RunSet",
        project: project._id,
        sessions: [session1._id],
        runs: [existingRun._id, newRun1._id, newRun2._id],
        annotationType: "PER_UTTERANCE",
      });

      const result = await RunSetService.mergeRunSets(
        targetRunSet._id,
        sourceRunSet._id,
      );

      expect(result.added).toHaveLength(2);
      expect(result.skipped).toHaveLength(1);
      expect(result.runSet.runs).toHaveLength(3);
    });

    it("merges multiple runSets at once", async () => {
      const targetRunSet = await RunSetService.create({
        name: "Target RunSet",
        project: project._id,
        sessions: [session1._id],
        runs: [],
        annotationType: "PER_UTTERANCE",
      });

      const run1 = await createTestRun({
        name: "Run 1",
        project: project._id,
        annotationType: "PER_UTTERANCE",
        sessions: [
          {
            sessionId: session1._id,
            status: "DONE",
            name: "Session 1",
            fileType: "json",
            startedAt: new Date(),
            finishedAt: new Date(),
          },
        ],
      });

      const run2 = await createTestRun({
        name: "Run 2",
        project: project._id,
        annotationType: "PER_UTTERANCE",
        sessions: [
          {
            sessionId: session1._id,
            status: "DONE",
            name: "Session 1",
            fileType: "json",
            startedAt: new Date(),
            finishedAt: new Date(),
          },
        ],
      });

      const run3 = await createTestRun({
        name: "Run 3",
        project: project._id,
        annotationType: "PER_UTTERANCE",
        sessions: [
          {
            sessionId: session1._id,
            status: "DONE",
            name: "Session 1",
            fileType: "json",
            startedAt: new Date(),
            finishedAt: new Date(),
          },
        ],
      });

      const source1 = await RunSetService.create({
        name: "Source 1",
        project: project._id,
        sessions: [session1._id],
        runs: [run1._id],
        annotationType: "PER_UTTERANCE",
      });

      const source2 = await RunSetService.create({
        name: "Source 2",
        project: project._id,
        sessions: [session1._id],
        runs: [run2._id, run3._id],
        annotationType: "PER_UTTERANCE",
      });

      const result = await RunSetService.mergeRunSets(targetRunSet._id, [
        source1._id,
        source2._id,
      ]);

      expect(result.added).toHaveLength(3);
      expect(result.added).toContain(run1._id);
      expect(result.added).toContain(run2._id);
      expect(result.added).toContain(run3._id);
      expect(result.skipped).toHaveLength(0);
      expect(result.runSet.runs).toHaveLength(3);
    });

    it("deduplicates runs when merging multiple runSets with overlapping runs", async () => {
      const sharedRun = await createTestRun({
        name: "Shared Run",
        project: project._id,
        annotationType: "PER_UTTERANCE",
        sessions: [
          {
            sessionId: session1._id,
            status: "DONE",
            name: "Session 1",
            fileType: "json",
            startedAt: new Date(),
            finishedAt: new Date(),
          },
        ],
      });

      const uniqueRun1 = await createTestRun({
        name: "Unique Run 1",
        project: project._id,
        annotationType: "PER_UTTERANCE",
        sessions: [
          {
            sessionId: session1._id,
            status: "DONE",
            name: "Session 1",
            fileType: "json",
            startedAt: new Date(),
            finishedAt: new Date(),
          },
        ],
      });

      const uniqueRun2 = await createTestRun({
        name: "Unique Run 2",
        project: project._id,
        annotationType: "PER_UTTERANCE",
        sessions: [
          {
            sessionId: session1._id,
            status: "DONE",
            name: "Session 1",
            fileType: "json",
            startedAt: new Date(),
            finishedAt: new Date(),
          },
        ],
      });

      const targetRunSet = await RunSetService.create({
        name: "Target RunSet",
        project: project._id,
        sessions: [session1._id],
        runs: [],
        annotationType: "PER_UTTERANCE",
      });

      const source1 = await RunSetService.create({
        name: "Source 1",
        project: project._id,
        sessions: [session1._id],
        runs: [sharedRun._id, uniqueRun1._id],
        annotationType: "PER_UTTERANCE",
      });

      const source2 = await RunSetService.create({
        name: "Source 2",
        project: project._id,
        sessions: [session1._id],
        runs: [sharedRun._id, uniqueRun2._id],
        annotationType: "PER_UTTERANCE",
      });

      const result = await RunSetService.mergeRunSets(targetRunSet._id, [
        source1._id,
        source2._id,
      ]);

      expect(result.added).toHaveLength(3);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped).toContain(sharedRun._id);
      expect(result.runSet.runs).toHaveLength(3);
    });
  });
});
