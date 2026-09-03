import mongoose from "mongoose";

export default new mongoose.Schema({
  name: { type: String },
  description: { type: String },
  color: { type: String, default: "#ff5567" },
  team: { type: mongoose.Types.ObjectId, ref: "Team" },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Types.ObjectId, ref: "User" },
  updatedAt: { type: Date },
  updatedBy: { type: mongoose.Types.ObjectId, ref: "User" },
});
