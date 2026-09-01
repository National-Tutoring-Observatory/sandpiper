import type { Job } from "bullmq";
import { RunService } from "../../app/modules/runs/run";
import emitFromJob from "../helpers/emitFromJob";

export default async function startAnnotateRun(job: Job) {
  const { runId } = job.data;

  if (!runId) {
    throw new Error("startAnnotateRun: runId is required");
  }

  const run = await RunService.findById(runId);
  if (!run) {
    // The run (or its run set) was deleted while these jobs sat in the queue.
    // Failing here just retries until attempts run out and fills the worker log
    // with stack traces on every restart.
    console.warn(`startAnnotateRun: run ${runId} no longer exists, skipping`);
    return { status: "SKIPPED" };
  }

  if (run.stoppedAt) {
    await emitFromJob(job, { runId }, "FINISHED");
    return { status: "STOPPED" };
  }

  await RunService.updateById(runId, {
    isRunning: true,
    isComplete: false,
    hasErrored: false,
    stoppedAt: null,
    startedAt: new Date(),
  });

  await emitFromJob(job, { runId }, "FINISHED");

  return {
    status: "SUCCESS",
  };
}
