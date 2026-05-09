import express from "express";
import Vaccination from "../models/Vaccination.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// GET /api/vaccinations — get my vaccination history
router.get("/", verifyToken, async (req, res) => {
  try {
    const records = await Vaccination.find({ userId: req.user.userId }).sort({ dateGiven: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vaccinations — CRP adds a vaccination record for a farmer
router.post("/", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "CRP") return res.status(403).json({ message: "Forbidden" });
    const { userId, type, ageGroup, dateGiven, nextDueDate, status } = req.body;
    if (!userId || !type || !dateGiven || !nextDueDate) {
      return res.status(400).json({ message: "userId, type, dateGiven, nextDueDate are required" });
    }

    const record = await Vaccination.create({ userId, type, ageGroup, dateGiven, nextDueDate, status });
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vaccinations/all — CRP gets all vaccination records
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

export default router;
