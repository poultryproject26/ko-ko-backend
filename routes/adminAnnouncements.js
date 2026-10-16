import express from "express";
import { verifyToken, requireAdmin } from "../middleware/auth.js";
import { notifyUsers, getUsersByRole } from "../utils/notificationService.js";

const router = express.Router();

const MESSAGE_MAX_LENGTH = 1000;
const TITLE_MAX_LENGTH = 120;
const VALID_AUDIENCES = ["crp", "farmer", "both"];

// POST /api/admin/announcements — Admin broadcasts a one-off announcement to
// all CRPs, all farmers, or both. This only composes existing, already-used
// helpers (getUsersByRole, notifyUsers) — no new delivery/FCM logic lives
// here, and notificationService.js/fcm.js/notificationScheduler.js are
// untouched, so every automatic notification workflow is unaffected.
router.post("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { title, message, audience } = req.body;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ message: "message is required" });
    }
    const trimmedMessage = message.trim();
    if (trimmedMessage.length > MESSAGE_MAX_LENGTH) {
      return res.status(400).json({ message: `message must be ${MESSAGE_MAX_LENGTH} characters or fewer` });
    }

    let trimmedTitle;
    if (title !== undefined && title !== null) {
      if (typeof title !== "string") {
        return res.status(400).json({ message: "title must be a string" });
      }
      trimmedTitle = title.trim();
      if (trimmedTitle.length > TITLE_MAX_LENGTH) {
        return res.status(400).json({ message: `title must be ${TITLE_MAX_LENGTH} characters or fewer` });
      }
    }

    if (!VALID_AUDIENCES.includes(audience)) {
      return res.status(400).json({ message: 'audience must be "crp", "farmer", or "both"' });
    }

    // Combining both audiences into one notifyUsers() call (one recipient
    // list, one Notification document) rather than two separate calls
    // avoids notificationService.js's same-day {type,title,message} duplicate
    // check silently dropping the second call when "both" is selected.
    let recipientIds;
    if (audience === "crp") {
      recipientIds = await getUsersByRole(["CRP"]);
    } else if (audience === "farmer") {
      recipientIds = await getUsersByRole(["SHG Member"]);
    } else {
      const [crpIds, farmerIds] = await Promise.all([
        getUsersByRole(["CRP"]),
        getUsersByRole(["SHG Member"]),
      ]);
      recipientIds = [...new Set([...crpIds, ...farmerIds])];
    }

    if (recipientIds.length === 0) {
      return res.json({ success: true, audience, recipientCount: 0, status: "no_recipients" });
    }

    const notifications = await notifyUsers(recipientIds, {
      type: "admin_announcement",
      title: trimmedTitle || "Announcement from Admin",
      message: trimmedMessage,
    });

    // notifyUsers() returns [] when notificationService.js's same-day
    // duplicate check suppressed this exact {type,title,message} — surfaced
    // here so the Admin isn't left thinking nothing happened for no reason.
    const notification = notifications[0] || null;

    res.status(201).json({
      success: true,
      audience,
      recipientCount: recipientIds.length,
      status: notification?.status || "duplicate_suppressed",
      notificationId: notification?.notification_id || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
