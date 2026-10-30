import dotenv from "dotenv";
import mongoose from "mongoose";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import Notification from "../models/Notification.js";
import {
  buildLegacyVaccinationReminderFilter,
  buildVaccinationReminderWordingUpdate,
  CORRECT_VACCINATION_REMINDER_FINAL_SENTENCE,
  LEGACY_VACCINATION_REMINDER_FINAL_SENTENCE,
  parseVaccinationReminderMigrationArgs,
} from "../utils/vaccinationReminderWording.js";

dotenv.config();

export async function inspectOrMigrateVaccinationReminderWording(args = process.argv.slice(2)) {
  const { apply, expectedCount } = parseVaccinationReminderMigrationArgs(args);

  await mongoose.connect(process.env.MONGO_URI);
  try {
    const filter = buildLegacyVaccinationReminderFilter();
    const matchingCount = await Notification.countDocuments(filter);

    console.log(JSON.stringify({
      collection: Notification.collection.name,
      matchingLegacyNotifications: matchingCount,
      filter: {
        type: filter.type,
        messageEndsWith: LEGACY_VACCINATION_REMINDER_FINAL_SENTENCE,
      },
      proposedReplacement: CORRECT_VACCINATION_REMINDER_FINAL_SENTENCE,
      mode: apply ? "apply" : "dry-run",
    }));

    if (!apply) return { matchingCount, modifiedCount: 0 };
    if (matchingCount !== expectedCount) {
      throw new Error(
        `Expected ${expectedCount} matching notifications, but found ${matchingCount}; no updates applied`,
      );
    }

    const result = await Notification.updateMany(
      filter,
      buildVaccinationReminderWordingUpdate(),
    );
    console.log(JSON.stringify({
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    }));
    return { matchingCount, modifiedCount: result.modifiedCount };
  } finally {
    await mongoose.disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  inspectOrMigrateVaccinationReminderWording().catch((error) => {
    console.error(`Vaccination reminder wording migration failed: ${error.message}`);
    process.exitCode = 1;
  });
}
