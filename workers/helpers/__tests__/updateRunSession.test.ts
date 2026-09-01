import { ProjectService } from "app/modules/projects/project";
import { RunService } from "app/modules/runs/run";
import { TeamService } from "app/modules/teams/team";
import { Types } from "mongoose";
import { beforeEach, describe, expect, it } from "vitest";
import clearDocumentDB from "../../../test/helpers/clearDocumentDB";
import createTestRun from "../../../test/helpers/createTestRun";
import updateRunSession from "../updateRunSession";

describe("updateRunSession helper", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  it("reports a deleted run instead of throwing", async () => {
    const fakeRunId = new Types.ObjectId().toString();
    const sessionId = new Types.ObjectId().toString();

    // Callers use this from their catch blocks, so throwing here replaced the
    // original failure with "Run not found".
    await expect(
      updateRunSession({
        runId: fakeRunId,
        sessionId,
        update: { status: "DONE" },
      }),
    ).resolves.toBe(false);
  });

  it("updates session status to DONE", async () => {
    const team = await TeamService.create({ name: "Test Team" });
    const project = await ProjectService.create({
      name: "Test Project",
      team: team._id,
      createdBy: new Types.ObjectId().toString(),
    });
    const sessionId = new Types.ObjectId().toString();
    const run = await createTestRun({
      name: "Test Run",
      project: project._id,
      isRunning: false,
      isComplete: false,
      sessions: [
        {
          sessionId,
          name: "session.json",
          fileType: "json",
          status: "RUNNING",
          startedAt: new Date(),
          finishedAt: new Date(),
        },
      ],
    });

    const finishedAt = new Date();
    await updateRunSession({
      runId: run._id,
      sessionId,
      update: {
        status: "DONE",
        finishedAt,
      },
    });

    const updatedRun = await RunService.findById(run._id);
    expect(updatedRun?.sessions).toHaveLength(1);
    expect(updatedRun?.sessions[0].status).toBe("DONE");
    expect(updatedRun?.sessions[0].finishedAt).toBeDefined();
  });

  it("updates session status to ERRORED", async () => {
    const team = await TeamService.create({ name: "Test Team" });
    const project = await ProjectService.create({
      name: "Test Project",
      team: team._id,
      createdBy: new Types.ObjectId().toString(),
    });
    const sessionId = new Types.ObjectId().toString();
    const run = await createTestRun({
      name: "Test Run",
      project: project._id,
      isRunning: false,
      isComplete: false,
      sessions: [
        {
          sessionId,
          name: "session.json",
          fileType: "json",
          status: "RUNNING",
          startedAt: new Date(),
          finishedAt: new Date(),
        },
      ],
    });

    const finishedAt = new Date();
    await updateRunSession({
      runId: run._id,
      sessionId,
      update: {
        status: "ERRORED",
        finishedAt,
      },
    });

    const updatedRun = await RunService.findById(run._id);
    expect(updatedRun?.sessions[0].status).toBe("ERRORED");
  });

  it("updates multiple sessions independently", async () => {
    const team = await TeamService.create({ name: "Test Team" });
    const project = await ProjectService.create({
      name: "Test Project",
      team: team._id,
      createdBy: new Types.ObjectId().toString(),
    });
    const sessionId1 = new Types.ObjectId().toString();
    const sessionId2 = new Types.ObjectId().toString();
    const run = await createTestRun({
      name: "Test Run",
      project: project._id,
      isRunning: false,
      isComplete: false,
      sessions: [
        {
          sessionId: sessionId1,
          name: "session1.json",
          fileType: "json",
          status: "RUNNING",
          startedAt: new Date(),
          finishedAt: new Date(),
        },
        {
          sessionId: sessionId2,
          name: "session2.json",
          fileType: "json",
          status: "RUNNING",
          startedAt: new Date(),
          finishedAt: new Date(),
        },
      ],
    });

    await updateRunSession({
      runId: run._id,
      sessionId: sessionId1,
      update: { status: "DONE" },
    });

    const updatedRun = await RunService.findById(run._id);
    expect(updatedRun?.sessions[0].status).toBe("DONE");
    expect(updatedRun?.sessions[1].status).toBe("RUNNING");
  });
});
