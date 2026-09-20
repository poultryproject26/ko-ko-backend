import express from "express";
import mongoose from "mongoose";
import MarketPrice from "../models/MarketPrice.js";
import User from "../models/User.js";
import { verifyToken } from "../middleware/auth.js";
import { notifyUsersByRole } from "../utils/notificationService.js";

const router = express.Router();

// MarketPrice.updatedBy is stored as a plain String (the CRP's User _id at the
// time of the update) — not a Mongoose ref, so it can't be .populate()'d.
// This resolves it to a display name at response time only; the stored value
// on the document itself is never rewritten, so no migration is needed and
// existing records are untouched.
async function resolveUpdatedByName(updatedBy) {
  if (updatedBy && mongoose.Types.ObjectId.isValid(updatedBy)) {
    const user = await User.findById(updatedBy).select("name");
    if (user?.name) return user.name;
  }
  return "Unknown";
}

// GET /api/market — get latest market price (public, no auth needed)
router.get("/", async (req, res) => {
  try {
    // No fabricated fallback numbers — if no CRP has ever set a real price,
    // say so plainly rather than presenting made-up figures as real ones.
    // null is handled by the frontend's existing "no price data" empty state.
    const price = await MarketPrice.findOne().sort({ updatedAt: -1 });
    if (!price) return res.json(null);

    const priceObj = price.toObject();
    priceObj.updatedBy = await resolveUpdatedByName(priceObj.updatedBy);
    res.json(priceObj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/market — CRP sets new market price
router.post("/", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "CRP") return res.status(403).json({ message: "Forbidden" });
    const { broiler, chick, egg } = req.body;
    if (!broiler || !chick || !egg) return res.status(400).json({ message: "All prices are required" });

    const price = await MarketPrice.create({
      broiler,
      chick,
      egg,
      updatedBy: req.user.userId,
    });

    await notifyUsersByRole(["SHG Member", "CRP"], {
      type: "market",
      title: "Market Price Update",
      message: `Market prices updated: Broiler ₹${broiler}/kg, Chick ₹${chick}, Egg ₹${egg}.`,
      payload: { broiler, chick, egg },
    });

    const priceObj = price.toObject();
    priceObj.updatedBy = await resolveUpdatedByName(priceObj.updatedBy);
    res.status(201).json(priceObj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
