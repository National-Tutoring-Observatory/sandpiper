import mongoose from "mongoose";

const paperRefSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    url: { type: String, required: true },
  },
  { _id: false },
);

const authorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    affiliation: { type: String },
  },
  { _id: false },
);

const librarySchema = new mongoose.Schema(
  {
    isPublished: { type: Boolean, default: false },
    description: { type: String, default: "" },
    authors: { type: [authorSchema], default: [] },
    paperRefs: { type: [paperRefSchema], default: [] },
    publishedAt: { type: Date },
  },
  { _id: false },
);

const copiedFromSchema = new mongoose.Schema(
  {
    prompt: { type: mongoose.Types.ObjectId, ref: "Prompt", required: true },
    name: { type: String, required: true },
    version: { type: Number, required: true },
    copiedAt: { type: Date, required: true },
  },
  { _id: false },
);

export default new mongoose.Schema({
  team: { type: mongoose.Types.ObjectId, ref: "Team" },
  name: { type: String },
  annotationType: {
    type: String,
    default: "PER_UTTERANCE",
    enum: ["PER_UTTERANCE", "PER_SESSION"],
  },
  productionVersion: { type: Number, default: 0 },
  library: { type: librarySchema, default: undefined },
  copiedFrom: { type: copiedFromSchema, default: undefined },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Types.ObjectId, ref: "User" },
  updatedAt: { type: Date },
  updatedBy: { type: mongoose.Types.ObjectId, ref: "User" },
  deletedAt: { type: Date },
});
