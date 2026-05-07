import mongoose from "mongoose";

const billingLedgerEntrySchema = new mongoose.Schema({
  team: { type: mongoose.Types.ObjectId, ref: "Team", required: true },
  user: { type: mongoose.Types.ObjectId, ref: "User" },
  direction: {
    type: String,
    enum: ["credit", "debit"],
    required: true,
  },
  amount: { type: Number, required: true },
  currency: { type: String, required: true, default: "USD" },
  rawAmount: { type: Number },
  markupRateApplied: { type: Number },
  billedAmount: { type: Number },
  model: { type: String },
  inputTokens: { type: Number },
  outputTokens: { type: Number },
  providerCost: { type: Number },
  source: { type: String, required: true },
  sourceId: { type: String },
  idempotencyKey: { type: String, required: true, unique: true },
  metadata: { type: mongoose.Schema.Types.Mixed },
  isLegacy: { type: Boolean, default: false },
  legacyNotes: { type: String },
  createdAt: { type: Date, default: Date.now },
});

billingLedgerEntrySchema.index({ team: 1, createdAt: -1 });
billingLedgerEntrySchema.index({ user: 1, createdAt: -1 });
billingLedgerEntrySchema.index({ team: 1, direction: 1, createdAt: -1 });
billingLedgerEntrySchema.index({ team: 1, source: 1, createdAt: -1 });

export default billingLedgerEntrySchema;
