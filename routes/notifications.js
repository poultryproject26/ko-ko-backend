import express from "express";
import Notification from "../models/Notification.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// GET /api/notifications — get notifications filtered by farmer's hamlet and shg_name
router.get("/", verifyToken, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === "SHG Member") {
      query = {
        $or: [
          { hamlet: { $exists: false }, shg_name: { $exists: false }, shg_names: { $exists: false } },
          { hamlet: null, shg_name: null },
          { hamlet: req.user.hamlet },
          { shg_name: req.user.shg_name },
          { shg_names: req.user.shg_name },
        ],
      };
    }
    const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(50);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications — CRP creates a notification
router.post("/", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "CRP") return res.status(403).json({ message: "Forbidden" });
    const { type, message, hamlet, shg_name, shg_names } = req.body;
    if (!type || !message) return res.status(400).json({ message: "type and message are required" });

    const notification = await Notification.create({ type, message, hamlet, shg_name, shg_names });
    res.status(201).json(notification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/notifications/:id — CRP deletes a notification
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "CRP") return res.status(403).json({ message: "Forbidden" });
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
