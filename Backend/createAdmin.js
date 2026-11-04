import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

async function createAdmin() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB Connected");

  const existing = await User.findOne({ phone: "9876543210" });
  if (existing) {
    console.log("⚠️  User with this phone already exists. Updating to ADMIN...");
    existing.name = "admin";
    existing.role = "ADMIN";
    existing.approved = true;
    existing.password = await bcrypt.hash("1234", 10);
    await existing.save();
    console.log("✅ Admin user updated.");
  } else {
    await User.create({
      name: "admin",
      phone: "9876543210",
      password: await bcrypt.hash("1234", 10),
      role: "ADMIN",
      approved: true,
    });
    console.log("✅ Admin user created.");
  }

  console.log("   Phone : 9876543210");
  console.log("   PIN   : 1234");
  process.exit(0);
}

createAdmin().catch((err) => { console.error(err); process.exit(1); });
