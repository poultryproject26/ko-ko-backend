import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  type: { type: String, enum: ["disease", "market", "tip", "vaccination_reminder"], required: true },
  message: { type: String, required: true },
  hamlet: { type: String },
  shg_name: { type: String },
  shg_names: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Notification", notificationSchema);
