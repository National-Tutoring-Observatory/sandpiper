import mongoose from "mongoose";

export default new mongoose.Schema({
  name: { type: String, required: true },
  project: { type: mongoose.Types.ObjectId, ref: "Project", required: true },
  annotationType: {
    type: String,
    enum: ["PER_UTTERANCE", "PER_SESSION"],
    required: true,
  },
  prompt: { type: mongoose.Types.ObjectId, ref: "Prompt" },
  promptVersion: { type: Number },
  isHuman: { type: Boolean, default: false },
  annotator: {
    name: { type: String },
  },
  isAdjudication: { type: Boolean, default: false },
  adjudication: {
    sourceRuns: [{ type: mongoose.Types.ObjectId, ref: "Run" }],
    disagreements: { type: mongoose.Schema.Types.Mixed },
  },
  sessions: [
    {
      sessionId: {
        type: mongoose.Types.ObjectId,
        ref: "Session",
        required: true,
      },
      status: { type: String, required: true },
      error: { type: mongoose.Schema.Types.Mixed },
      name: { type: String, required: true },
      fileType: { type: String },
      startedAt: { type: Date, default: Date.now },
      finishedAt: { type: Date, default: Date.now },
    },
  ],
  snapshot: {
    prompt: {
      name: { type: String },
      userPrompt: { type: String },
      annotationSchema: [mongoose.Schema.Types.Mixed],
      annotationType: { type: String },
      version: { type: Number },
      systemPrompt: { type: String },
      verifySystemPrompt: { type: String },
      adjudicateSystemPrompt: { type: String },
    },
    model: {
      code: { type: String },
      name: { type: String },
      provider: { type: String },
    },
  },
  stoppedAt: { type: Date },
  isRunning: { type: Boolean, default: false },
  isComplete: { type: Boolean, default: false },
  hasErrored: { type: Boolean, default: false },
  isExporting: { type: Boolean, default: false },
  shouldRunVerification: { type: Boolean, default: false },
  startedAt: { type: Date },
  finishedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Types.ObjectId, ref: "User" },
  updatedAt: { type: Date },
  updatedBy: { type: mongoose.Types.ObjectId, ref: "User" },
});
