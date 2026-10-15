import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/User.js";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const phone = "9876543210";
  const user = await User.findOne({ phone }).select("-password").populate("crpId", "name phone designation assignedLocation");

  console.log("User document (password excluded):");
  console.log(JSON.stringify(user, null, 2));

  await mongoose.disconnect();
}

run().catch((err) => { console.error("Error:", err.message); process.exit(1); });
