import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../models/User.js";
import { isValidPhone, isValidPin } from "../utils/passwordAuth.js";

dotenv.config();

const { MONGO_URI, ADMIN_PHONE, ADMIN_INITIAL_PASSWORD } = process.env;

if (!MONGO_URI || !isValidPhone(ADMIN_PHONE) || !isValidPin(ADMIN_INITIAL_PASSWORD)) {
  console.error("Set MONGO_URI, ADMIN_PHONE, and a four-digit ADMIN_INITIAL_PASSWORD before running this script.");
  process.exit(1);
}

try {
  await mongoose.connect(MONGO_URI);
  const passwordHash = await bcrypt.hash(ADMIN_INITIAL_PASSWORD, 10);
  const result = await User.updateOne(
    { phone: ADMIN_PHONE, role: "ADMIN" },
    { $set: { password: passwordHash } }
  );
  if (result.matchedCount !== 1) {
    throw new Error("No existing Admin account matched the configured phone");
  }
  console.log("Admin password initialized or reset successfully.");
} catch {
  console.error("Admin password provisioning failed.");
  process.exitCode = 1;
} finally {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}
