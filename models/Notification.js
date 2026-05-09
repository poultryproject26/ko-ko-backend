import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  type: { type: String, enum: ["disease", "market", "tip"], required: true },
  message: { type: String, required: true },
  hamlet: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Notification", notificationSchema);
