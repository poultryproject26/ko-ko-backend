import express from "express";
import User from "../models/User.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// GET /api/farmers — CRP gets all SHG Member users
router.get("/", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "CRP") return res.status(403).json({ message: "Forbidden" });
    const farmers = await User.find({ role: "SHG Member" }).sort({ created_at: -1 });
    res.json(farmers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/farmers/:id/approve
router.patch("/:id/approve", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "CRP") return res.status(403).json({ message: "Forbidden" });
    const farmer = await User.findByIdAndUpdate(req.params.id, { approved: true }, { new: true });
    if (!farmer) return res.status(404).json({ message: "Farmer not found" });
    res.json(farmer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/farmers/:id/reject
router.delete("/:id/reject", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "CRP") return res.status(403).json({ message: "Forbidden" });
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/farmers/:id — CRP deletes an existing farmer
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "CRP") return res.status(403).json({ message: "Forbidden" });
    const farmer = await User.findByIdAndDelete(req.params.id);
    if (!farmer) return res.status(404).json({ message: "Farmer not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
