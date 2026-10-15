import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../models/User.js";
import Crp from "../models/Crp.js";
import Hamlet from "../models/Hamlet.js";
import { isValidPhone, isValidPin } from "../utils/passwordAuth.js";

dotenv.config();

const CRP_HAMLET_MAP = [
  { name: "Thamarai Selvi", phone: "8883694239", designation: "CRP", assignedLocation: "Namakkal",        hamlets: ["Namakkal"] },
  { name: "Jayanthi",       phone: "9655792497", designation: "CRP", assignedLocation: "Mohanur",         hamlets: ["Mohanur"] },
  { name: "Vennila",        phone: "7402506372", designation: "CRP", assignedLocation: "Mallasamudram",   hamlets: ["Mallasamudram"] },
  { name: "Palaniyammal",   phone: "9688765143", designation: "CRP", assignedLocation: "Pallipalayam",   hamlets: ["Pallipalayam"] },
  { name: "Kalaiselvi",     phone: "9500365785", designation: "CRP", assignedLocation: "Konangipatti",   hamlets: ["Konangipatti"] },
];

// Tamil renderings of the English hamlet names above, needed because Hamlet.nameTa
// is now required. Best-effort transliteration for seed purposes only — exact
// alignment with any legacy farmer-facing hamlet names is a later reconciliation
// concern, not this seed script's job.
const HAMLET_NAME_TA = {
  "Namakkal":      "நாமக்கல்",
  "Mohanur":       "மோகனூர்",
  "Mallasamudram": "மல்லசமுத்திரம்",
  "Pallipalayam":  "பள்ளிபாளையம்",
  "Konangipatti":  "கோணாங்கிப்பட்டி",
};

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  // 1. Create Admin
  if (!(await User.findOne({ role: "ADMIN" }))) {
    const adminPhone = process.env.ADMIN_PHONE;
    const initialPassword = process.env.ADMIN_INITIAL_PASSWORD;
    if (!isValidPhone(adminPhone) || !isValidPin(initialPassword)) {
      throw new Error("Set ADMIN_PHONE and a four-digit ADMIN_INITIAL_PASSWORD before creating the initial Admin");
    }
    const password = await bcrypt.hash(initialPassword, 10);
    const admin = await User.create({ name: "Admin", phone: adminPhone, password, role: "ADMIN", approved: true });
    console.log(`✅ Admin created — id: ${admin._id}`);
  } else {
    console.log("Admin already exists — skipping");
  }

  // 2. Seed CRPs + Hamlet assignments
  for (const entry of CRP_HAMLET_MAP) {
    let crp = await Crp.findOne({ phone: entry.phone });
    if (!crp) {
      crp = await Crp.create({ name: entry.name, phone: entry.phone, designation: entry.designation, assignedLocation: entry.assignedLocation, status: "Active" });
      console.log(`✅ CRP created: ${entry.name} (${entry.phone})`);
    } else {
      console.log(`CRP exists: ${entry.name} — skipping`);
    }

    // Create CRP User account if missing
    if (!(await User.findOne({ phone: entry.phone }))) {
      await User.create({ name: entry.name, phone: entry.phone, role: "CRP", crpProfileId: crp._id, approved: true });
      console.log(`   CRP login created for ${entry.phone}`);
    }

    // Create hamlets and assign CRP
    for (const hamletName of entry.hamlets) {
      let hamlet = await Hamlet.findOne({ name: hamletName });
      if (!hamlet) {
        hamlet = await Hamlet.create({
          name: hamletName,
          nameEn: hamletName,
          nameTa: HAMLET_NAME_TA[hamletName] || hamletName,
          crpId: crp._id,
        });
        console.log(`   Hamlet created: ${hamletName} → ${entry.name}`);
      } else if (!hamlet.crpId || !hamlet.nameTa || !hamlet.nameEn) {
        // findByIdAndUpdate (not .save()) so this never triggers full-document
        // validation against fields untouched by this update.
        await Hamlet.findByIdAndUpdate(hamlet._id, {
          crpId: hamlet.crpId || crp._id,
          nameTa: hamlet.nameTa || HAMLET_NAME_TA[hamletName] || hamletName,
          nameEn: hamlet.nameEn || hamletName,
        });
        console.log(`   Hamlet updated: ${hamletName} → ${entry.name}`);
      }
    }
  }

  console.log("\n✅ Seed complete.");
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
