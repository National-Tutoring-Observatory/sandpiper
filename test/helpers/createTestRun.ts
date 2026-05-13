import mongoose, { Types } from "mongoose";
import runSchema from "~/lib/schemas/run.schema";
import type { Run } from "~/modules/runs/runs.types";

const RunModel = mongoose.models.Run || mongoose.model("Run", runSchema);

const defaults: Partial<Run> = {
  annotationType: "PER_UTTERANCE",
  prompt: new Types.ObjectId().toString(),
  promptVersion: 1,
  sessions: [],
  snapshot: {
    prompt: {
      name: "Test Prompt",
      userPrompt: "Test prompt",
      annotationSchema: [],
      annotationType: "PER_UTTERANCE",
      version: 1,
      systemPrompt: "",
      verifySystemPrompt: "",
      adjudicateSystemPrompt: "",
    },
    model: {
      code: "test-model",
      name: "Test Model",
      provider: "test",
    },
  },
};

export default async function createTestRun(data: Partial<Run>): Promise<Run> {
  const doc = await RunModel.create({ ...defaults, ...data });
  return doc.toJSON({ flattenObjectIds: true });
}
