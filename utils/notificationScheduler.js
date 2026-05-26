import cron from "node-cron";
import BirdBatch from "../models/BirdBatch.js";
import Vaccination from "../models/Vaccination.js";
import Notification from "../models/Notification.js";
import { generateSchedule, getNotificationMessages } from "./scheduleEngine.js";

async function runDailyCheck() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const batches = await BirdBatch.find({ batchStatus: "active" }).populate("userId");

    for (const batch of batches) {
      const farmer = batch.userId;
      if (!farmer) continue;

      const schedule = generateSchedule(batch.batchDate);

      for (const event of schedule) {
        const eventDate = new Date(event.scheduledDate);
        eventDate.setHours(0, 0, 0, 0);

        const diffDays = Math.round((eventDate - today) / 86400000);

        const isR2B = event.type === "R2B" || event.type === "R2B_booster";

        // Regular vaccines: notify 3 days before
        // R2B: notify 3, 2 days before and on the day (0)
        const validDiff = diffDays === 3 || (isR2B && (diffDays === 2 || diffDays === 0));
        if (!validDiff) continue;

        // Skip if already completed or missed
        const existing = await Vaccination.findOne({
          batchId: batch._id,
          type: event.type,
          scheduledDate: eventDate,
          status: { $in: ["completed", "missed"] },
        });
        if (existing) continue;

        const messages = getNotificationMessages(event, diffDays);

        for (const message of messages) {
          const fullMessage = `[${farmer.name} - ${batch.batchName}] ${message}`;

          // Dedup: same message same day
          const dup = await Notification.findOne({
            type: "vaccination_reminder",
            message: fullMessage,
            createdAt: { $gte: today },
          });
          if (dup) continue;

          await Notification.create({
            type: "vaccination_reminder",
            message: fullMessage,
            hamlet: farmer.hamlet,
            shg_name: farmer.shg_name,
          });
        }
      }
    }
    console.log("✅ Vaccination reminder check complete");
  } catch (err) {
    console.error("❌ Notification scheduler error:", err.message);
  }
}

export function startNotificationScheduler() {
  // Run every day at 8:00 AM
  cron.schedule("0 8 * * *", runDailyCheck);
  console.log("📅 Vaccination notification scheduler started");
}
