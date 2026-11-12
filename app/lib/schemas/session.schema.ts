import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
  name: { type: String },
  project: { type: mongoose.Types.ObjectId, ref: "Project" },
  file: { type: mongoose.Types.ObjectId, ref: "File" },
  sessionId: { type: mongoose.Types.ObjectId },
  fileType: { type: String },
  error: { type: String },
  hasConverted: { type: Boolean, default: false },
  inputTokens: { type: Number },
  startedAt: { type: Date },
  finishedAt: { type: Date },
  hasErrored: { type: Boolean, default: false },
  tags: { type: [{ type: mongoose.Types.ObjectId, ref: "Tag" }], default: [] },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Types.ObjectId, ref: "User" },
  updatedAt: { type: Date },
  updatedBy: { type: mongoose.Types.ObjectId, ref: "User" },
});

sessionSchema.index({ tags: 1 });
sessionSchema.index({ project: 1, name: 1 });
sessionSchema.index({ project: 1, createdAt: -1 });
sessionSchema.index({ project: 1, hasConverted: 1 });

export default sessionSchema;
