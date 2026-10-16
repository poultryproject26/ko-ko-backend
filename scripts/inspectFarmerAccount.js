import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/User.js";
import Otp from "../models/Otp.js";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const phone = "9876543210";
  const user = await User.findOne({ phone }).select("-password").populate("crpId", "name phone designation assignedLocation");
  const otpRecords = await Otp.find({ phone }).select("expiresAt used -_id").lean();

  console.log("User document (password excluded):");
  console.log(JSON.stringify(user, null, 2));
  console.log("\nOTP records for this phone (code excluded):");
  console.log(JSON.stringify(otpRecords, null, 2));

  await mongoose.disconnect();
}

run().catch((err) => { console.error("Error:", err.message); process.exit(1); });
