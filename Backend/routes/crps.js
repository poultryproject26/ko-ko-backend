import express from "express";
import bcrypt from "bcryptjs";
import Crp from "../models/Crp.js";
import User from "../models/User.js";
import Hamlet from "../models/Hamlet.js";
import { verifyToken, requireAdmin } from "../middleware/auth.js";
import { reassignHamletCrp } from "../utils/hamletCrp.js";
import { hashPin, isValidPhone, isValidPin } from "../utils/passwordAuth.js";

const router = express.Router();

// GET /api/crps
router.get("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const crps = await Crp.find().populate("assignedHamlets", "name").sort({ createdAt: -1 });
    res.json(crps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/crps — Admin creates a new CRP + User account
router.post("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { name, phone, designation, assignedLocation, assignedHamlets, status, password } = req.body;
    if (!name || !isValidPhone(phone)) {
      return res.status(400).json({ message: "name and valid phone required" });
    }

    if (await Crp.findOne({ phone })) return res.status(400).json({ message: "CRP with this phone already exists" });

    // A new CRP login account needs an explicit password — there is no default.
    // Checked before anything is written so a failed request leaves no partial CRP.
    const existingUser = await User.findOne({ phone });
    if (existingUser && String(existingUser.role || "").toUpperCase() !== "CRP") {
      return res.status(409).json({ message: "Phone already belongs to another account type" });
    }
    const needsLoginAccount = !existingUser;
    if (needsLoginAccount && !isValidPin(password)) {
      return res.status(400).json({ message: "Password must contain exactly four digits" });
    }

    const crp = await Crp.create({
      name,
      phone,
      designation,
      assignedLocation,
      assignedHamlets: Array.isArray(assignedHamlets) ? assignedHamlets : [],
      status: status || "Active",
    });

    if (Array.isArray(assignedHamlets) && assignedHamlets.length) {
      for (const hamletId of assignedHamlets) {
        await reassignHamletCrp(hamletId, crp._id);
      }
    }

    if (needsLoginAccount) {
      const hashed = await hashPin(bcrypt, password);
      await User.create({ name, phone, password: hashed, role: "CRP", crpProfileId: crp._id, approved: true });
    }

    res.status(201).json(crp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin-only in-person enrollment/recovery for the CRP tied to this profile.
router.post("/:id/password", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { password } = req.body || {};
    const passwordHash = await hashPin(bcrypt, password);
    if (!passwordHash) {
      return res.status(400).json({ message: "Password must contain exactly four digits" });
    }

    const crp = await Crp.findById(req.params.id);
    if (!crp) return res.status(404).json({ message: "CRP not found" });

    const existing = await User.findOne({ phone: crp.phone });
    if (existing && String(existing.role).toUpperCase() !== "CRP") {
      return res.status(409).json({ message: "CRP account is unavailable" });
    }

    if (existing) {
      const updated = await User.findOneAndUpdate(
        { _id: existing._id, role: "CRP" },
        { $set: { password: passwordHash, crpProfileId: crp._id, approved: true } },
        { new: true, runValidators: true }
      );
      if (!updated) return res.status(409).json({ message: "CRP account is unavailable" });
    } else {
      await User.create({
        name: crp.name,
        phone: crp.phone,
        password: passwordHash,
        role: "CRP",
        crpProfileId: crp._id,
        approved: true,
      });
    }

    return res.json({ success: true });
  } catch {
    return res.status(500).json({ message: "Could not set CRP password" });
  }
});

// PATCH /api/crps/:id — Admin updates CRP
router.patch("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { name, phone, designation, assignedLocation, assignedHamlets, status } = req.body;
    const crp = await Crp.findById(req.params.id);
    if (!crp) return res.status(404).json({ message: "CRP not found" });

    if (Array.isArray(assignedHamlets)) {
      const previousHamlets = Array.isArray(crp.assignedHamlets) ? crp.assignedHamlets : [];
      const previousSet = new Set(previousHamlets.map(String));
      const nextSet = new Set(assignedHamlets.map(String));
      const removed = [...previousSet].filter((id) => !nextSet.has(id));

      for (const hamletId of removed) {
        await reassignHamletCrp(hamletId, null);
      }
      for (const hamletId of assignedHamlets) {
        await reassignHamletCrp(hamletId, crp._id);
      }
      crp.assignedHamlets = assignedHamlets;
    }

    crp.name = name ?? crp.name;
    crp.phone = phone ?? crp.phone;
    crp.designation = designation ?? crp.designation;
    crp.assignedLocation = assignedLocation ?? crp.assignedLocation;
    if (status) crp.status = status;
    crp.updatedAt = new Date();

    await crp.save();
    await User.findOneAndUpdate({ crpProfileId: crp._id }, { name: crp.name, phone: crp.phone });
    res.json(crp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/crps/:id/status — Activate / Deactivate
router.patch("/:id/status", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["Active", "Inactive"].includes(status)) return res.status(400).json({ message: "status must be Active or Inactive" });
    const crp = await Crp.findByIdAndUpdate(req.params.id, { status, updatedAt: new Date() }, { new: true });
    if (!crp) return res.status(404).json({ message: "CRP not found" });
    res.json(crp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/crps/:id/hamlets — Assign hamlets to CRP
router.patch("/:id/hamlets", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { hamletIds } = req.body; // array of hamlet _ids
    if (!Array.isArray(hamletIds)) return res.status(400).json({ message: "hamletIds must be an array" });

    const crp = await Crp.findById(req.params.id);
    if (!crp) return res.status(404).json({ message: "CRP not found" });

    const previousHamlets = Array.isArray(crp.assignedHamlets) ? crp.assignedHamlets : [];
    const previousSet = new Set(previousHamlets.map(String));
    const nextSet = new Set(hamletIds.map(String));
    const removed = [...previousSet].filter((id) => !nextSet.has(id));

    for (const hamletId of removed) {
      await reassignHamletCrp(hamletId, null);
    }
    for (const hamletId of hamletIds) {
      await reassignHamletCrp(hamletId, crp._id);
    }

    crp.assignedHamlets = hamletIds;
    await crp.save();

    res.json({ success: true, assigned: hamletIds.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/crps/:id — Admin deletes CRP. Clears the CRP relationship from
// every Hamlet/farmer that referenced it before removing anything, so no
// dangling crpId is left behind. Hamlets, Streets, and farmer records are
// never deleted — only the CRP link on them is cleared. The CRP document
// itself is deleted last, so if an earlier step fails, retrying this request
// is safe (the clearing steps are idempotent) rather than leaving the CRP
// gone with stale references still pointing at it.
router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const crp = await Crp.findById(req.params.id);
    if (!crp) return res.status(404).json({ message: "CRP not found" });

    // Identify every Hamlet actually pointing at this CRP (the authoritative
    // Hamlet.crpId field, not the CRP's own possibly-stale assignedHamlets
    // array) and unassign each through the shared helper — the same sync path
    // every other CRP/hamlet mutation uses, so this preserves the same
    // Hamlet.crpId <-> Crp.assignedHamlets <-> User.crpId invariant rather than
    // duplicating that logic here.
    const hamletsToUnassign = await Hamlet.find({ crpId: crp._id }, "_id");
    for (const hamlet of hamletsToUnassign) {
      await reassignHamletCrp(hamlet._id, null);
    }

    // Safety net: clear crpId on any farmer still referencing this CRP
    // directly, even one whose hamlet assignment was already inconsistent
    // (e.g. a stale crpId that didn't match their hamlet's own crpId).
    await User.updateMany({ crpId: crp._id, role: "SHG Member" }, { crpId: null });

    // Only now remove the CRP's login account and the CRP document itself —
    // nothing still references crp._id at this point.
    await User.findOneAndDelete({ crpProfileId: crp._id });
    await Crp.findByIdAndDelete(crp._id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
