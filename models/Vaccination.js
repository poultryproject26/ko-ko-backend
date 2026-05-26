import mongoose from "mongoose";

const vaccinationSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  batchId:      { type: mongoose.Schema.Types.ObjectId, ref: "BirdBatch", required: true },
  type: {
    type: String,
    enum: ["F_vaccine", "IBD", "LaSota", "fowl_pox", "deworming", "R2B", "R2B_booster", "white_diarrhea", "smallpox"],
    required: true,
  },
  label:          { type: String },
  ageGroup:       { type: String },
  scheduledDate:  { type: Date, required: true },
  completedDate:  { type: Date },
  completedBy:    { type: String },
  rescheduledDate:{ type: Date },
  notes:          { type: String },
  status: {
    type: String,
    enum: ["scheduled", "completed", "missed", "rescheduled"],
    default: "scheduled",
  },
  isAutoScheduled: { type: Boolean, default: true },
  createdAt:      { type: Date, default: Date.now },
});

export default mongoose.model("Vaccination", vaccinationSchema);
