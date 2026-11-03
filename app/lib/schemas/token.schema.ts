import mongoose from "mongoose";

const tokenSchema = new mongoose.Schema({
  name: { type: String, required: true },
  token: { type: String, required: true, select: false },
  tokenPrefix: { type: String, required: true },
  ref: { type: mongoose.Types.ObjectId, required: true },
  refType: { type: String, enum: ["team"], required: true },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Types.ObjectId, ref: "User" },
  expiresAt: { type: Date },
  lastUsedAt: { type: Date },
  usageCount: { type: Number, default: 0 },
  rateLimitCount: { type: Number, default: 0 },
  rateLimitWindowStart: { type: Date },
});

tokenSchema.index({ token: 1 }, { unique: true });
tokenSchema.index({ ref: 1, refType: 1, isDeleted: 1 });

export default tokenSchema;
