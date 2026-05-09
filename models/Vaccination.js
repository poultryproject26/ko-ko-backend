import mongoose from "mongoose";

const vaccinationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: {
    type: String,
    enum: ["white_diarrhea", "smallpox", "deworming"],
    required: true,
  },
  ageGroup: { type: String },
  dateGiven: { type: Date, required: true },
  nextDueDate: { type: Date, required: true },
  status: { type: String, enum: ["completed", "pending"], default: "completed" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Vaccination", vaccinationSchema);
