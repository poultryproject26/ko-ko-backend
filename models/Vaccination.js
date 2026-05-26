import mongoose from "mongoose";

const vaccinationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: {
    type: String,
    enum: ["F_vaccine", "IBD", "LaSota", "fowl_pox", "deworming", "R2B", "R2B_booster", "white_diarrhea", "smallpox"],
    required: true,
  },
  label: { type: String },
  ageGroup: { type: String },
  dateGiven: { type: Date, required: true },
  nextDueDate: { type: Date, required: true },
  status: { type: String, enum: ["completed", "pending", "scheduled"], default: "completed" },
  isAutoScheduled: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Vaccination", vaccinationSchema);
