import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Crp from "../models/Crp.js";
import Hamlet from "../models/Hamlet.js";
import Street from "../models/Street.js";

dotenv.config();

const DEFAULT_PIN = "1234";

async function run() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected successfully to DB:", mongoose.connection.name);

  // 1. Find a reference hamlet and street
  let hamlet = await Hamlet.findOne({});
  let street = null;
  if (hamlet) {
    street = await Street.findOne({ hamletId: hamlet._id });
  }

  // 2. Setup CRP Profile for Demo CRP
  const crpPhone = "9876500002";
  let crpProfile = await Crp.findOne({ phone: crpPhone });
  if (!crpProfile) {
    crpProfile = await Crp.create({
      name: "Demo CRP",
      phone: crpPhone,
      designation: "CRP",
      assignedHamlets: hamlet ? [hamlet._id] : [],
      status: "Active"
    });
    console.log("Created CRP profile for Demo CRP:", crpProfile._id);
  } else {
    crpProfile.status = "Active";
    if (hamlet && !crpProfile.assignedHamlets.includes(hamlet._id)) {
      crpProfile.assignedHamlets.push(hamlet._id);
    }
    await crpProfile.save();
    console.log("Updated existing CRP profile to Active:", crpProfile._id);
  }

  // 3. Define the 3 users
  const hashedPin = await bcrypt.hash(DEFAULT_PIN, 10);

  const ACCOUNTS = [
    {
      phone: "9876500001",
      name: "Demo Farmer",
      role: "SHG Member",
      approved: true,
      password: hashedPin,
      hamletId: hamlet ? hamlet._id : null,
      streetId: street ? street._id : null,
      crpId: crpProfile._id,
      hamlet: hamlet ? (hamlet.nameTa || hamlet.name) : "Konangipatti",
      street: street ? (street.nameTa || street.name) : "Main Street",
      houseNo: "12/A",
      shg_name: "Roja SHG"
    },
    {
      phone: "9876500002",
      name: "Demo CRP",
      role: "CRP",
      approved: true,
      password: hashedPin,
      crpProfileId: crpProfile._id,
      hamletId: hamlet ? hamlet._id : null,
      hamlet: hamlet ? (hamlet.nameTa || hamlet.name) : "Konangipatti"
    },
    {
      phone: "9876500003",
      name: "Demo Admin",
      role: "ADMIN",
      approved: true,
      password: hashedPin
    }
  ];

  const results = [];

  for (const acc of ACCOUNTS) {
    let user = await User.findOne({ phone: acc.phone });
    if (user) {
      Object.assign(user, acc);
      await user.save();
      results.push({ phone: user.phone, name: user.name, role: user.role, status: "updated", pin: DEFAULT_PIN });
    } else {
      user = await User.create(acc);
      results.push({ phone: user.phone, name: user.name, role: user.role, status: "created", pin: DEFAULT_PIN });
    }

    // Verify token generation & pin match
    const pinMatches = await bcrypt.compare(DEFAULT_PIN, user.password);
    const token = jwt.sign(
      { userId: user._id, role: String(user.role).toUpperCase(), hamlet: user.hamlet },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "7d" }
    );

    console.log(`[VERIFIED] ${user.name} (${user.role}) - PIN match: ${pinMatches}, Token issued: ${Boolean(token)}`);
  }

  console.log("\n--- ACCOUNTS SETUP COMPLETE ---");
  console.log(JSON.stringify(results, null, 2));

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
