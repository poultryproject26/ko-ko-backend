import express from "express";
import SaleStock from "../models/SaleStock.js";
import User from "../models/User.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// GET /api/sale-stocks — get all available stocks (public for buyers)
router.get("/", async (req, res) => {
  try {
    const stocks = await SaleStock.find()
      .populate("userId", "name phone hamlet street houseNo shg_name")
      .sort({ createdAt: -1 });
    res.json(stocks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sale-stocks — farmer submits stock for sale
router.post("/", verifyToken, async (req, res) => {
  try {
    const { broilers, chicks, eggs } = req.body;
    const user = await User.findById(req.user.userId);
    await SaleStock.deleteMany({ userId: req.user.userId, status: "available" });
    const stock = await SaleStock.create({
      userId: req.user.userId,
      farmerName: user.name,
      hamlet: user.hamlet,
      phone: user.phone,
      broilers: broilers || 0,
      chicks: chicks || 0,
      eggs: eggs || 0,
    });
    res.status(201).json(stock);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/sale-stocks/:id/sold — mark as sold. A Farmer may only mark
// their own stock; a CRP only stock belonging to a farmer assigned to them
// (same crpProfileId/crpId check used to scope GET /farmers for a CRP);
// an Admin may mark any record, matching the existing Admin permissions model.
router.patch("/:id/sold", verifyToken, async (req, res) => {
  try {
    const stock = await SaleStock.findById(req.params.id);
    if (!stock) return res.status(404).json({ message: "Sale stock not found" });

    const role = String(req.user.role || "").toUpperCase();

    if (role === "ADMIN") {
      // Admin: no additional ownership check, consistent with other admin routes.
    } else if (role === "CRP") {
      const [crpUser, farmer] = await Promise.all([
        User.findById(req.user.userId, "crpProfileId"),
        User.findById(stock.userId, "crpId"),
      ]);
      const isAssigned = crpUser?.crpProfileId && farmer?.crpId
        && String(farmer.crpId) === String(crpUser.crpProfileId);
      if (!isAssigned) return res.status(403).json({ message: "Forbidden" });
    } else {
      // Farmer (or any other authenticated role): only their own record.
      if (String(stock.userId) !== String(req.user.userId)) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }

    stock.status = "sold";
    stock.soldAt = new Date();
    await stock.save();
    res.json(stock);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
