import express from "express";
import Vaccination from "../models/Vaccination.js";
import BirdBatch from "../models/BirdBatch.js";
import { verifyToken } from "../middleware/auth.js";
import { generateSchedule } from "../utils/scheduleEngine.js";

const router = express.Router();

function buildScheduleResult(schedule, completedRecords) {
  const completedKeys = new Set(
    completedRecords
      .filter((v) => v.status === "completed")
      .map((v) => v.type + new Date(v.dateGiven).toISOString().split("T")[0])
  );
  const today = new Date();
  return schedule.map((e) => {
    const key = e.type + new Date(e.scheduledDate).toISOString().split("T")[0];
    const isPast = new Date(e.scheduledDate) < today;
    return {
      ...e,
      status: completedKeys.has(key) ? "completed" : isPast ? "overdue" : "upcoming",
    };
  });
}

// GET /api/vaccinations — farmer's own history
router.get("/", verifyToken, async (req, res) => {
  try {
    const records = await Vaccination.find({ userId: req.user.userId }).sort({ dateGiven: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vaccinations/all — CRP: all records
router.get("/all", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "CRP") return res.status(403).json({ message: "Forbidden" });
    const records = await Vaccination.find()
      .populate("userId", "name phone hamlet")
      .sort({ dateGiven: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vaccinations/schedule/me — farmer sees own schedule
router.get("/schedule/me", verifyToken, async (req, res) => {
  try {
    const batch = await BirdBatch.findOne({ userId: req.user.userId });
    if (!batch) return res.json({ batchDate: null, schedule: [] });

    const schedule = generateSchedule(batch.batchDate);
    const completed = await Vaccination.find({ userId: req.user.userId, isAutoScheduled: true });
    const result = buildScheduleResult(schedule, completed);

    res.json({ batchDate: batch.batchDate, schedule: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vaccinations/schedule/:farmerId — CRP sees a farmer's schedule
router.get("/schedule/:farmerId", verifyToken, async (req, res) => {
  try {
    const batch = await BirdBatch.findOne({ userId: req.params.farmerId });
    if (!batch) return res.json({ batchDate: null, schedule: [] });

    const schedule = generateSchedule(batch.batchDate);
    const completed = await Vaccination.find({ userId: req.params.farmerId, isAutoScheduled: true });
    const result = buildScheduleResult(schedule, completed);

    res.json({ batchDate: batch.batchDate, schedule: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vaccinations/batch — CRP sets batchDate → generates full schedule
router.post("/batch", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "CRP") return res.status(403).json({ message: "Forbidden" });
    const { userId, batchDate } = req.body;
    if (!userId || !batchDate) return res.status(400).json({ message: "userId and batchDate required" });

    await BirdBatch.findOneAndUpdate(
      { userId },
      { userId, batchDate: new Date(batchDate), updatedAt: new Date() },
      { upsert: true, new: true }
    );

    await Vaccination.deleteMany({ userId, isAutoScheduled: true });

    const events = generateSchedule(batchDate);
    const records = events.map((e) => ({
      userId,
      type: e.type,
      label: e.label,
      dateGiven: e.scheduledDate,
      nextDueDate: e.scheduledDate,
      status: "scheduled",
      isAutoScheduled: true,
    }));

    await Vaccination.insertMany(records);
    res.status(201).json({ message: "Schedule generated", count: records.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vaccinations — CRP manually adds a record
router.post("/", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "CRP") return res.status(403).json({ message: "Forbidden" });
    const { userId, type, label, ageGroup, dateGiven, nextDueDate, status } = req.body;
    if (!userId || !type || !dateGiven || !nextDueDate)
      return res.status(400).json({ message: "userId, type, dateGiven, nextDueDate are required" });
    const record = await Vaccination.create({ userId, type, label, ageGroup, dateGiven, nextDueDate, status });
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/vaccinations/:id/complete — CRP marks a scheduled vaccination as done
router.patch("/:id/complete", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "CRP") return res.status(403).json({ message: "Forbidden" });
    const record = await Vaccination.findByIdAndUpdate(
      req.params.id,
      { status: "completed", dateGiven: new Date() },
      { new: true }
    );
    if (!record) return res.status(404).json({ message: "Not found" });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
