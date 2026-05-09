import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: String,
  phone: {
    type: String,
    required: true,
    unique: true
  },
  role: {
    type: String,
    enum: ["SHG Member", "CRP"],
    default: "SHG Member"
  },
  hamlet: String,
  street: String,
  houseNo: String,
  shg_name: String,
  approved: { type: Boolean, default: false },
  created_at: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("User", userSchema);