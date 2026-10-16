import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../models/User.js";

dotenv.config();

// Exactly these three accounts, and nothing else — no existing user is read
// beyond a phone-existence check, none is modified or deleted.
const ACCOUNTS = [
  { name: "Test Farmer", phone: "9876543210", role: "SHG Member", password: null,   approved: true },
  { name: "Test CRP",    phone: "9876543211", role: "CRP",        password: "crp",   approved: true },
  { name: "Test Admin",  phone: "9876543212", role: "ADMIN",      password: "admin", approved: true },
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const results = [];
  for (const acc of ACCOUNTS) {
    const existing = await User.findOne({ phone: acc.phone });
    if (existing) {
      results.push({ _id: existing._id.toString(), phone: existing.phone, role: existing.role, status: "already existed — skipped" });
      continue;
    }

    const doc = { name: acc.name, phone: acc.phone, role: acc.role, approved: acc.approved };
    if (acc.password) doc.password = await bcrypt.hash(acc.password, 10);

    const user = await User.create(doc);
    results.push({ _id: user._id.toString(), phone: user.phone, role: user.role, status: "created" });
  }

  // Never logs password/OTP/connection-string values — only id/phone/role/status.
  console.log(JSON.stringify(results, null, 2));

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
