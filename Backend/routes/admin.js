import express from "express";
import Crp from "../models/Crp.js";
import User from "../models/User.js";
import Hamlet from "../models/Hamlet.js";
import BirdBatch from "../models/BirdBatch.js";
import { verifyToken, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// GET /api/admin/overview — Admin: operational summary counts.
//
// totalActiveBirds is a rough ESTIMATE, not a live count: BirdBatch.activeBirdCount
// is set once at batch creation (POST /vaccinations/batches) and is never decremented
// for mortality or sales anywhere in this codebase, and BirdBatch.mortalityCount is
// never written to at all. It reflects the starting size of batches a CRP hasn't
// manually marked "inactive" — treat it as an upper bound, not ground truth.
router.get("/overview", verifyToken, requireAdmin, async (req, res) => {
  try {
    const [totalCrps, totalFarmers, totalHamlets, activeBirdsAgg] = await Promise.all([
      Crp.countDocuments(),
      User.countDocuments({ role: "SHG Member" }),
      Hamlet.countDocuments(),
      BirdBatch.aggregate([
        { $match: { batchStatus: "active" } },
        { $group: { _id: null, total: { $sum: "$activeBirdCount" } } },
      ]),
    ]);

    const totalActiveBirds = activeBirdsAgg[0]?.total || 0;

    res.json({ totalCrps, totalFarmers, totalHamlets, totalActiveBirds });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
