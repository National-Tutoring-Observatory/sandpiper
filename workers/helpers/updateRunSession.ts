import mongoose from "mongoose";
import runSchema from "../../app/lib/schemas/run.schema";
import type { RunSession } from "../../app/modules/runs/runs.types";

const RunModel = mongoose.models.Run || mongoose.model("Run", runSchema);

// Returns false when the run no longer exists. Callers use this from their own
// catch blocks to record an error on the run, so throwing here would replace the
// original failure with "Run not found" — and a run deleted mid-flight is a
// normal outcome, not a fault worth retrying.
export default async function updateRunSession({
  runId,
  sessionId,
  update,
}: {
  runId: string;
  sessionId: string;
  update: Partial<RunSession>;
}): Promise<boolean> {
  // Build dot notation updates for atomic operation
  const setUpdate: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(update)) {
    setUpdate[`sessions.$[elem].${key}`] = value;
  }

  const result = await RunModel.findByIdAndUpdate(
    runId,
    { $set: setUpdate },
    {
      arrayFilters: [{ "elem.sessionId": sessionId }],
      new: true,
    },
  );

  return result !== null;
}
