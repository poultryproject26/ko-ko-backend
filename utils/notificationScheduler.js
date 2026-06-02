import cron from "node-cron";
import BirdBatch from "../models/BirdBatch.js";
import Vaccination from "../models/Vaccination.js";
import User from "../models/User.js";
import { generateSchedule, getNotificationType, getNotificationMessage } from "./scheduleEngine.js";
import { notifyUsers, notifyUsersByRole, retryFailedNotifications } from "./notificationService.js";

function normalizeDate(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(d) {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

async function runDailyCheck() {
  try {
    const today = normalizeDate(new Date());
    const crpUsers = await User.find({ role: "CRP" }, { _id: 1 });
    const crpIds = crpUsers.map((user) => user._id.toString());

    const batches = await BirdBatch.find({ batchStatus: "active" }).populate("userId");

    for (const batch of batches) {
      const farmer = batch.userId;
      if (!farmer) continue;

      const schedule = generateSchedule(batch.batchDate);

      for (const event of schedule) {
        const eventDate = normalizeDate(event.scheduledDate);
        const diffDays = Math.round((eventDate - today) / 86400000);
        const notificationType = getNotificationType(event.type, diffDays);
        const message = getNotificationMessage(event, diffDays);
        if (!notificationType || !message) continue;

        const existed = await Vaccination.findOne({
          batchId: batch._id,
          type: event.type,
          scheduledDate: eventDate,
          status: { $in: ["completed", "missed"] },
        });
        if (existed) continue;

        const title = notificationType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        const payload = {
          batchId: batch._id.toString(),
          vaccinationType: event.type,
          scheduledDate: eventDate.toISOString(),
          reminderType: notificationType,
        };

        await notifyUsers(
          [farmer._id.toString(), ...crpIds],
          {
            batchId: batch._id,
            type: notificationType,
            title,
            message: `[${batch.batchName}] ${message}`,
            hamlet: farmer.hamlet,
            shg_name: farmer.shg_name,
            payload,
          }
        );
      }
    }

    const overdueRecords = await Vaccination.find({
      status: "scheduled",
      scheduledDate: { $lt: today },
      batchId: { $exists: true },
    }).populate("userId");

    for (const record of overdueRecords) {
      const farmer = record.userId;
      const title = "Vaccine Overdue";
      const message = `Vaccination ${record.type} scheduled on ${formatDate(record.scheduledDate)} is overdue.`;
      await notifyUsers(
        crpIds,
        {
          batchId: record.batchId,
          type: "vaccine_overdue",
          title,
          message,
          hamlet: farmer?.hamlet,
          shg_name: farmer?.shg_name,
          payload: {
            batchId: record.batchId?.toString?.(),
            vaccinationId: record._id.toString(),
          },
        }
      );
    }

    const mortalityThreshold = Number(process.env.MORTALITY_THRESHOLD || 5);
    const mortalityBatches = await BirdBatch.find({ mortalityCount: { $gte: mortalityThreshold } }).populate("userId");

    for (const batch of mortalityBatches) {
      const farmer = batch.userId;
      const title = "Mortality Alert";
      const message = `Mortality count for ${batch.batchName} has exceeded threshold (${batch.mortalityCount}).`;
      await notifyUsers(
        crpIds,
        {
          batchId: batch._id,
          type: "mortality_alert",
          title,
          message,
          hamlet: farmer?.hamlet,
          shg_name: farmer?.shg_name,
          payload: {
            batchId: batch._id.toString(),
            mortalityCount: batch.mortalityCount,
          },
        }
      );
    }

    const pendingCount = await User.countDocuments({ role: "SHG Member", approved: false });
    if (pendingCount > 0) {
      await notifyUsersByRole(
        ["CRP"],
        {
          type: "approval_reminder",
          title: "Pending Approval Reminder",
          message: `There are ${pendingCount} farmer registrations pending approval. Please review them.`,
          payload: { pendingCount },
        }
      );
    }

    await retryFailedNotifications();
    console.log("✅ Notification scheduler check complete");
  } catch (err) {
    console.error("❌ Notification scheduler error:", err.message);
  }
}

export function startNotificationScheduler() {
  cron.schedule("0 8 * * *", runDailyCheck);
  console.log("📅 Vaccination notification scheduler started");
}
