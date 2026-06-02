import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Otp from "../models/Otp.js";
import { notifyUsersByRole } from "../utils/notificationService.js";

const router = express.Router();

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/auth/send-otp
router.post("/send-otp", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || phone.length !== 10) return res.status(400).json({ message: "Valid phone required" });

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await Otp.deleteMany({ phone });
    await Otp.create({ phone, code, expiresAt });

    console.log(`OTP for ${phone}: ${code}`);

    res.json({ success: true, message: "OTP sent", otp: code });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/verify-otp
router.post("/verify-otp", async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ message: "phone and otp required" });

    const record = await Otp.findOne({ phone, code: otp, used: false });
    if (!record) return res.status(400).json({ message: "Invalid OTP" });
    if (record.expiresAt < new Date()) return res.status(400).json({ message: "OTP expired" });

    record.used = true;
    await record.save();

    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ message: "User not found. Please register first." });
    if (!user.approved) return res.status(403).json({ message: "pending", approved: false });

    const token = jwt.sign(
      { userId: user._id, role: user.role, hamlet: user.hamlet },
      process.env.JWT_SECRET
    );

    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { phone, name, hamlet, street, houseNo, shg_name } = req.body;
    if (!phone || !name || !hamlet || !shg_name) return res.status(400).json({ message: "Required fields missing" });

    const existing = await User.findOne({ phone });
    if (existing) return res.status(400).json({ message: "Phone already registered" });

    const user = await User.create({ phone, name, hamlet, street, houseNo, shg_name, role: "SHG Member", approved: false });

    const crpIds = await notifyUsersByRole(["CRP"], {
      type: "user_registration_pending",
      title: "New farmer registration pending approval",
      message: `${name} has registered and is awaiting approval.`,
      payload: { userId: user._id.toString(), hamlet, shg_name },
    });

    res.status(201).json({ success: true, user, notificationsSent: crpIds.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/seed-crp
router.post("/seed-crp", async (req, res) => {
  try {
    const { phone, name, role, hamlet, secret } = req.body;
    if (secret !== process.env.SEED_SECRET) return res.status(403).json({ message: "Forbidden" });
    if (role !== "CRP") return res.status(400).json({ message: "Only CRP can be seeded" });

    const existing = await User.findOne({ phone });
    if (existing) return res.status(400).json({ message: "User already exists" });

    const user = await User.create({ phone, name, role, hamlet, approved: true });
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
