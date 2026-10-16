import dotenv from "dotenv";
import mongoose from "mongoose";
import Hamlet from "../models/Hamlet.js";
import Street from "../models/Street.js";

dotenv.config();

const HAMLET_MAP = {
  "Namakkal": { nameTa: "நாமக்கல்", nameEn: "Namakkal" },
  "காட்டூர்": { nameTa: "காட்டூர்", nameEn: "Kattur" },
  "Mohanur": { nameTa: "மோகனூர்", nameEn: "Mohanur" },
  "Konangipatti": { nameTa: "கோணங்கிபட்டி", nameEn: "Konangipatti" },
  "Mallasamudram": { nameTa: "மல்லசமுத்திரம்", nameEn: "Mallasamudram" },
  "Pallipalayam": { nameTa: "பள்ளிபாளையம்", nameEn: "Pallipalayam" },
};

const STREET_MAP = {
  "கிழக்கு தெரு": { nameTa: "கிழக்கு தெரு", nameEn: "East Street" },
  "நடுத்தெரு": { nameTa: "நடுத்தெரு", nameEn: "Middle Street" },
  "காட்டூர் தெற்கு தெரு": { nameTa: "காட்டூர் தெற்கு தெரு", nameEn: "Kattur South Street" },
  "இதர": { nameTa: "இதர", nameEn: "Other" },
  "மேற்கு தெரு": { nameTa: "மேற்கு தெரு", nameEn: "West Street" },
  "வடக்கு தெரு": { nameTa: "வடக்கு தெரு", nameEn: "North Street" },
  "கல்லாங்குத்து தெரு": { nameTa: "கல்லாங்குத்து தெரு", nameEn: "Kallanguthu Street" },
  "தெற்கு தெரு": { nameTa: "தெற்கு தெரு", nameEn: "South Street" },
  "ஆதி திராவிடர் தெரு": { nameTa: "ஆதி திராவிடர் தெரு", nameEn: "Aadi Dravidar Street" },
  "அம்பேத்கர் தெரு": { nameTa: "அம்பேத்கர் தெரு", nameEn: "Ambedkar Street" },
};

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const hamlets = await Hamlet.find({});
  console.log(`Found ${hamlets.length} hamlets to check`);
  for (const h of hamlets) {
    const map = HAMLET_MAP[h.name];
    if (map) {
      h.nameTa = map.nameTa;
      h.nameEn = map.nameEn;
    } else {
      if (!h.nameTa) h.nameTa = h.name;
      if (!h.nameEn) h.nameEn = h.name;
    }
    await h.save();
    console.log(`Updated hamlet: ${h.name} -> Ta: "${h.nameTa}", En: "${h.nameEn}"`);
  }

  const streets = await Street.find({});
  console.log(`Found ${streets.length} streets to check`);
  for (const s of streets) {
    const map = STREET_MAP[s.name];
    if (map) {
      s.nameTa = map.nameTa;
      s.nameEn = map.nameEn;
    } else {
      if (!s.nameTa) s.nameTa = s.name;
      if (!s.nameEn) s.nameEn = s.name;
    }
    await s.save();
    console.log(`Updated street: ${s.name} -> Ta: "${s.nameTa}", En: "${s.nameEn}"`);
  }

  await mongoose.disconnect();
  console.log("Migration complete!");
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
