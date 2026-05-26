import cron from "node-cron";
import BirdBatch from "../models/BirdBatch.js";
import Notification from "../models/Notification.js";
import { generateSchedule, getNotificationMessages } from "./scheduleEngine.js";

async function runDailyCheck() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const batches = await BirdBatch.find().populate("userId");

    for (const batch of batches) {
      const farmer = batch.userId;
      if (!farmer) continue;

      const schedule = generateSchedule(batch.batchDate);

      for (const event of schedule) {
        const eventDate = new Date(event.scheduledDate);
        eventDate.setHours(0, 0, 0, 0);

        const diffDays = Math.round((eventDate - today) / 86400000);

        if (diffDays !== 3 && diffDays !== 2) continue;

        const isR2B = event.type === "R2B" || event.type === "R2B_booster";
        if (diffDays === 2 && !isR2B) continue;

        const messages = getNotificationMessages(event, diffDays);

        for (const message of messages) {
          const fullMessage = `[${farmer.name}] ${message}`;

          const existing = await Notification.findOne({
            type: "vaccination_reminder",
            message: fullMessage,
            createdAt: { $gte: today },
          });
          if (existing) continue;

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
  cron.schedule("0 8 * * *", runDailyCheck);
  console.log("📅 Vaccination notification scheduler started");
}
