import express from "express";
import BirdBatch from "../models/BirdBatch.js";
import BirdUpdate from "../models/BirdUpdate.js";
import SaleStock from "../models/SaleStock.js";
import VaccinationStock from "../models/VaccinationStock.js";
import ServiceDemand from "../models/ServiceDemand.js";
import DiseaseReport from "../models/DiseaseReport.js";
import { verifyToken, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// Shared farmer + canonical hamlet populate — nested so every report row
// carries both the legacy `hamlet` string snapshot and the canonical
// Hamlet document (nameTa/nameEn), letting the frontend group by the
// canonical hamlet and fall back to "Unresolved" when hamletId is null.
const FARMER_POPULATE = {
  path: "userId",
  select: "name phone hamlet street houseNo shg_name hamletId",
  populate: { path: "hamletId", select: "nameTa nameEn" },
};

// GET /api/admin/reports/bird-batches — all registered batches across every
// hamlet. numberOfChicks/activeBirdCount are as-registered figures; see
// AdminReports.tsx for the "estimate" caveat shown alongside this data.
router.get("/bird-batches", verifyToken, requireAdmin, async (req, res) => {
  try {
    const batches = await BirdBatch.find().populate(FARMER_POPULATE).sort({ createdAt: -1 });
    res.json(batches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/reports/bird-updates-latest — one row per farmer: their most
// recent weekly submission only. Summing every historical BirdUpdate row
// (as CRP reports do) inflates every week a farmer submits, so this
// endpoint deliberately returns a single current-snapshot row per farmer
// instead of the full history.
router.get("/bird-updates-latest", verifyToken, requireAdmin, async (req, res) => {
  try {
    const latest = await BirdUpdate.aggregate([
      { $sort: { userId: 1, weekDate: -1, createdAt: -1 } },
      { $group: { _id: "$userId", doc: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$doc" } },
      { $sort: { weekDate: -1 } },
    ]);
    const populated = await BirdUpdate.populate(latest, FARMER_POPULATE);
    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/reports/sale-stock — all sale-stock rows (both "available"
// and "sold") across every hamlet. Admin-only twin of the public
// GET /sale-stocks — that route/permissions are unchanged.
router.get("/sale-stock", verifyToken, requireAdmin, async (req, res) => {
  try {
    const stocks = await SaleStock.find().populate(FARMER_POPULATE).sort({ createdAt: -1 });
    res.json(stocks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/reports/vaccination-stock — admin-only twin of the
// CRP-only GET /vaccination-stock/all; that route/permissions are unchanged.
router.get("/vaccination-stock", verifyToken, requireAdmin, async (req, res) => {
  try {
    const stocks = await VaccinationStock.find().populate(FARMER_POPULATE).sort({ updatedAt: -1 });
    res.json(stocks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/reports/services — all service demands, including Loan
// requests (type === "Loan"). Admin-only twin of the CRP-only
// GET /services/all; that route/permissions are unchanged.
router.get("/services", verifyToken, requireAdmin, async (req, res) => {
  try {
    const demands = await ServiceDemand.find().populate(FARMER_POPULATE).sort({ createdAt: -1 });
    res.json(demands);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/reports/diseases — admin-only twin of the CRP-only
// GET /disease/all; that route/permissions are unchanged.
router.get("/diseases", verifyToken, requireAdmin, async (req, res) => {
  try {
    const reports = await DiseaseReport.find().populate(FARMER_POPULATE).sort({ reportedAt: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
