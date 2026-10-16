import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

dotenv.config();

const DEFAULT_PIN = "1234";

function isValidPin(pin) {
  return typeof pin === "string" && /^\d{4}$/.test(pin);
}

async function run() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to database:", mongoose.connection.name);

  const users = await User.find({});
  console.log(`Found ${users.length} total users in DB.`);

  const hashedPin = await bcrypt.hash(DEFAULT_PIN, 10);
  let updatedCount = 0;
  let alreadyHasValidPinCount = 0;

  for (const user of users) {
    let needsUpdate = false;

    // Check if user has no password
    if (!user.password) {
      needsUpdate = true;
    } else {
      // Check if user has a non-numeric or invalid legacy password like "crp", "admin"
      // If we compare with "1234" and it already matches, it's valid
      const isAlready1234 = await bcrypt.compare(DEFAULT_PIN, user.password).catch(() => false);
      if (!isAlready1234) {
        // If password is not a bcrypt hash or if it's legacy
        // Let's check if the password is valid bcrypt
        const isBcrypt = typeof user.password === "string" && user.password.startsWith("$2");
        if (!isBcrypt) {
          needsUpdate = true;
        } else {
          // If it's already a bcrypt hash, they either set a custom PIN or have a password
          // But wait, earlier "Test CRP" and "Test Admin" had bcrypt.hash("crp") which is impossible to type on the 4-digit keypad!
          // If it was "crp" or "admin", let's check:
          const isCrpText = await bcrypt.compare("crp", user.password).catch(() => false);
          const isAdminText = await bcrypt.compare("admin", user.password).catch(() => false);
          if (isCrpText || isAdminText) {
            needsUpdate = true;
          } else {
            alreadyHasValidPinCount++;
          }
        }
      } else {
        alreadyHasValidPinCount++;
      }
    }

    if (needsUpdate) {
      user.password = hashedPin;
      await user.save();
      updatedCount++;
      console.log(`Updated user ${user.name} (${user.phone}, Role: ${user.role}) with default PIN 1234.`);
    }
  }

  console.log("\n================ MIGRATION REPORT ================");
  console.log(`Total users checked: ${users.length}`);
  console.log(`Users updated with PIN 1234: ${updatedCount}`);
  console.log(`Users already having a valid PIN: ${alreadyHasValidPinCount}`);
  console.log("==================================================");

  // Test one updated user
  const sample = await User.findOne({ phone: "8072131199" }); // Venu Prasath
  if (sample) {
    const valid = await bcrypt.compare("1234", sample.password);
    console.log(`Verification for ${sample.name} (${sample.phone}): PIN '1234' matches? ${valid}`);
  }

  await mongoose.disconnect();
  console.log("Done!");
}

run().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
