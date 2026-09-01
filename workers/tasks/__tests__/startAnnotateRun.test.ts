import { ProjectService } from "app/modules/projects/project";
import { RunService } from "app/modules/runs/run";
import { TeamService } from "app/modules/teams/team";
import type { Job } from "bullmq";
import { Types } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import clearDocumentDB from "../../../test/helpers/clearDocumentDB";
import createTestRun from "../../../test/helpers/createTestRun";
import startAnnotateRun from "../startAnnotateRun";

vi.mock("../../helpers/emitFromJob");

describe("startAnnotateRun worker", () => {
  beforeEach(async () => {
    await clearDocumentDB();
    vi.clearAllMocks();
  });

  it("throws error if runId is missing", async () => {
    const job = {
      id: "job-1",
      data: {},
    } as any as Job;

    await expect(startAnnotateRun(job)).rejects.toThrow(
      "startAnnotateRun: runId is required",
    );
  });

  it("skips instead of failing when the run was deleted", async () => {
    const fakeRunId = new Types.ObjectId().toString();
    const job = {
      id: "job-1",
      data: { runId: fakeRunId },
    } as any as Job;

    // Deleting a run or run set leaves its queued jobs behind; retrying them
    // to exhaustion buried the worker log in stack traces on every restart.
    await expect(startAnnotateRun(job)).resolves.toEqual({
      status: "SKIPPED",
    });
  });

  it("marks run as started", async () => {
    const team = await TeamService.create({ name: "Test Team" });
    const project = await ProjectService.create({
      name: "Test Project",
      team: team._id,
      createdBy: new Types.ObjectId().toString(),
    });
    const run = await createTestRun({
      name: "Test Run",
      project: project._id,
      isRunning: false,
      isComplete: false,
    });

    const job = {
      id: "job-1",
      data: { runId: run._id },
    } as any as Job;

    const result = await startAnnotateRun(job);

    expect(result.status).toBe("SUCCESS");

    const updatedRun = await RunService.findById(run._id);
    expect(updatedRun?.isRunning).toBe(true);
    expect(updatedRun?.isComplete).toBe(false);
    expect(updatedRun?.hasErrored).toBe(false);
    expect(updatedRun?.startedAt).toBeDefined();
  });

  it("returns correct status on success", async () => {
    const team = await TeamService.create({ name: "Test Team" });
    const project = await ProjectService.create({
      name: "Test Project",
      team: team._id,
      createdBy: new Types.ObjectId().toString(),
    });
    const run = await createTestRun({
      name: "Test Run",
      project: project._id,
      isRunning: false,
      isComplete: false,
    });

    const job = {
      id: "job-1",
      data: { runId: run._id },
    } as any as Job;

    const result = await startAnnotateRun(job);

    expect(result).toEqual({ status: "SUCCESS" });
  });
});
