import { Types } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import createTestRun from "../../../../test/helpers/createTestRun";
import { RunService } from "../run";

vi.mock("../services/createRunAnnotations.server", () => ({
  default: vi.fn(),
}));

const projectId = new Types.ObjectId().toString();

describe("RunService.start", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  it("resets stale state from a previous run", async () => {
    const run = await createTestRun({
      name: "Test Run",
      project: projectId as any,
      isRunning: true,
      isComplete: true,
      hasErrored: true,
      stoppedAt: new Date(),
    });

    await RunService.start(run, undefined, "user-123");

    const updated = await RunService.findById(run._id);
    expect(updated!.isRunning).toBe(false);
    expect(updated!.isComplete).toBe(false);
    expect(updated!.hasErrored).toBe(false);
    expect(updated!.stoppedAt).toBeNull();
  });

  it("does not set isRunning to true", async () => {
    const run = await createTestRun({
      name: "Test Run",
      project: projectId as any,
      isRunning: false,
      isComplete: false,
      hasErrored: false,
    });

    await RunService.start(run, undefined, "user-123");

    const updated = await RunService.findById(run._id);
    expect(updated!.isRunning).toBe(false);
  });

  it("calls createRunAnnotations", async () => {
    const { default: createRunAnnotations } =
      await import("../services/createRunAnnotations.server");

    const run = await createTestRun({
      name: "Test Run",
      project: projectId as any,
      isRunning: false,
      isComplete: false,
      hasErrored: false,
    });

    await RunService.start(run, undefined, "user-123");

    expect(createRunAnnotations).toHaveBeenCalledWith(
      run,
      undefined,
      "user-123",
    );
  });
});
