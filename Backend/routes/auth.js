import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Hamlet from "../models/Hamlet.js";
import Street from "../models/Street.js";
import Crp from "../models/Crp.js";
import { notifyUsersByRole } from "../utils/notificationService.js";
import { verifyToken, requireAdmin } from "../middleware/auth.js";
import { authenticateUserPassword, hashPin, isValidPhone, isValidPin } from "../utils/passwordAuth.js";

const router = express.Router();

// User documents carry the bcrypt password hash for ADMIN/CRP accounts; never
// send it to the client (it ends up persisted in the app's localStorage).
function toSafeUser(user) {
  const obj = user.toObject();
  delete obj.password;
  return obj;
}

// A CRP whose Crp profile an Admin set to "Inactive" must not be able to sign
// in. Legacy CRP users without a crpProfileId have no status and are allowed.
async function isInactiveCrp(user) {
  if (String(user.role || "").toUpperCase() !== "CRP" || !user.crpProfileId) return false;
  const crp = user.crpProfileId.status !== undefined
    ? user.crpProfileId
    : await Crp.findById(user.crpProfileId, "status");
  return crp?.status === "Inactive";
}

// Case-insensitive exact match against a Hamlet's name/nameTa/nameEn — used
// only by the legacy string-based fallback paths below (register, profile),
// which never invent an id or guess: an ambiguous match (2+ hamlets sharing
// the supplied value) is treated the same as no match at all. No fuzzy,
// partial, or transliteration matching — exact string equality after
// trimming/case-folding only.
async function findHamletByLegacyName(hamletName) {
  if (!hamletName) return null;
  const target = hamletName.trim().toLowerCase();
  if (!target) return null;

  const hamlets = await Hamlet.find({}, "name nameTa nameEn crpId");
  const matches = hamlets.filter((h) =>
    [h.name, h.nameTa, h.nameEn].some((v) => typeof v === "string" && v.trim().toLowerCase() === target)
  );

  return matches.length === 1 ? matches[0] : null;
}

// POST /api/auth/login — phone + 4-digit password login for permitted roles.
router.post("/login", async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!isValidPhone(phone) || !isValidPin(password)) {
      return res.status(401).json({ message: "Invalid phone number or password" });
    }

    const user = await User.findOne({ phone }).select("+password").populate("crpProfileId");
    const inactiveCrp = String(user?.role || "").toUpperCase() === "CRP" && await isInactiveCrp(user);
    if (!await authenticateUserPassword({ user, password, bcrypt, inactiveCrp })) {
      return res.status(401).json({ message: "Invalid phone number or password" });
    }

    const token = jwt.sign(
      { userId: user._id, role: String(user.role || "").toUpperCase(), hamlet: user.hamlet },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    res.json({ token, user: toSafeUser(user) });
  } catch {
    res.status(500).json({ message: "Authentication unavailable" });
  }
});

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { phone, name, hamletId, streetId, houseNo, shg_name } = req.body;
    if (!isValidPhone(phone) || !name || !shg_name) return res.status(400).json({ message: "Valid phone, name, and SHG group are required" });

    const existing = await User.findOne({ phone });
    if (existing) return res.status(400).json({ message: "Phone already registered" });

    // Resolve hamlet/street names and crpId from IDs
    let hamletName = req.body.hamlet || "";
    let streetName = req.body.street || "";
    let resolvedHamletId = null;
    let resolvedStreetId = null;
    let crpId = null;

    if (hamletId) {
      // Preferred path — caller supplied a real hamletId (and optionally streetId).
      const hamletDoc = await Hamlet.findById(hamletId).populate("crpId");
      if (!hamletDoc) return res.status(400).json({ message: "Invalid hamletId" });

      resolvedHamletId = hamletDoc._id;
      hamletName = hamletDoc.nameTa || hamletDoc.name || hamletName;
      crpId = hamletDoc.crpId?._id || null;

      if (streetId) {
        const streetDoc = await Street.findById(streetId);
        if (!streetDoc || streetDoc.hamletId.toString() !== hamletDoc._id.toString()) {
          return res.status(400).json({ message: "streetId does not belong to the selected hamlet" });
        }
        resolvedStreetId = streetDoc._id;
        streetName = streetDoc.nameTa || streetDoc.name || streetName;
      }
    } else if (hamletName) {
      // Legacy fallback for older app versions, which only send plain hamlet/street
      // names (not ids). Matches case-insensitively against name/nameTa/nameEn;
      // never invents an id or assigns an arbitrary CRP — if nothing (or more
      // than one hamlet) matches, ids stay null.
      const hamletDoc = await findHamletByLegacyName(hamletName);
      if (hamletDoc) {
        resolvedHamletId = hamletDoc._id;
        crpId = hamletDoc.crpId || null;

        if (streetName) {
          const streetDoc = await Street.findOne({ name: streetName, hamletId: resolvedHamletId });
          if (streetDoc) resolvedStreetId = streetDoc._id;
        }
      }
    }

    const user = await User.create({
      phone, name,
      hamletId: resolvedHamletId,
      streetId: resolvedStreetId,
      crpId,
      hamlet: hamletName,
      street: streetName,
      houseNo,
      shg_name,
      role: "SHG Member",
      approved: false,
    });

    await notifyUsersByRole(["CRP"], {
      type: "user_registration_pending",
      title: "New farmer registration pending approval",
      message: `${name} has registered and is awaiting approval.`,
      payload: { userId: user._id.toString(), hamlet: hamletName, shg_name },
    });

    res.status(201).json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/seed-crp — Admin-only (was previously reachable by anyone who
// knew SEED_SECRET; verifyToken/requireAdmin now gate it first, and the
// SEED_SECRET check is kept as a second, independent check on top).
router.post("/seed-crp", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { phone, name, role, hamlet, secret, password } = req.body;
    if (secret !== process.env.SEED_SECRET) return res.status(403).json({ message: "Forbidden" });
    if (role !== "CRP") return res.status(400).json({ message: "Only CRP can be seeded" });
    if (!isValidPhone(phone) || !isValidPin(password)) {
      return res.status(400).json({ message: "Valid phone and four-digit password are required" });
    }

    const existing = await User.findOne({ phone });
    if (existing) return res.status(400).json({ message: "User already exists" });

    const passwordHash = await hashPin(bcrypt, password);
    const user = await User.create({ phone, name, role, hamlet, password: passwordHash, approved: true });
    res.status(201).json(toSafeUser(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/auth/profile — farmer updates own profile
router.patch("/profile", verifyToken, async (req, res) => {
  try {
    const { name, houseNo, hamlet, street, hamletId, streetId } = req.body;
    const allowed = {};
    if (name  !== undefined) allowed.name    = String(name).trim();
    if (houseNo !== undefined) allowed.houseNo = String(houseNo).trim();

    if (hamletId) {
      // Preferred ID-based path. Free-text hamlet/street on the same request are
      // ignored — the denormalized display strings only ever come from the
      // resolved canonical documents, never from client-supplied text.
      const hamletDoc = await Hamlet.findById(hamletId);
      if (!hamletDoc) return res.status(400).json({ message: "Invalid hamletId" });

      allowed.hamletId = hamletDoc._id;
      allowed.crpId = hamletDoc.crpId || null;
      allowed.hamlet = hamletDoc.nameTa || hamletDoc.name || "";

      if (streetId) {
        const streetDoc = await Street.findById(streetId);
        if (!streetDoc || streetDoc.hamletId.toString() !== hamletDoc._id.toString()) {
          return res.status(400).json({ message: "streetId does not belong to the selected hamlet" });
        }
        allowed.streetId = streetDoc._id;
        allowed.street = streetDoc.nameTa || streetDoc.name || "";
      }
    } else if (hamlet !== undefined) {
      // Legacy free-text fallback for older app versions — matches case-
      // insensitively against name/nameTa/nameEn; otherwise unchanged behavior.
      const hamletName = String(hamlet).trim();
      allowed.hamlet = hamletName;
      const hamletDoc = await findHamletByLegacyName(hamletName);
      const resolvedHamletId = hamletDoc ? hamletDoc._id : null;
      allowed.hamletId = resolvedHamletId;
      allowed.crpId = hamletDoc ? (hamletDoc.crpId || null) : null;

      if (street !== undefined) {
        const streetName = String(street).trim();
        allowed.street = streetName;
        const streetDoc = (streetName && resolvedHamletId)
          ? await Street.findOne({ name: streetName, hamletId: resolvedHamletId })
          : null;
        allowed.streetId = streetDoc ? streetDoc._id : null;
      }
    } else if (street !== undefined) {
      // Street-only free-text change, hamlet untouched — legacy behavior. Resolves
      // against the farmer's existing hamletId.
      const streetName = String(street).trim();
      allowed.street = streetName;
      const hamletIdForStreet = (await User.findById(req.user.userId, "hamletId"))?.hamletId || null;
      const streetDoc = (streetName && hamletIdForStreet)
        ? await Street.findOne({ name: streetName, hamletId: hamletIdForStreet })
        : null;
      allowed.streetId = streetDoc ? streetDoc._id : null;
    }

    if (!allowed.name) return res.status(400).json({ message: "Name is required" });

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: allowed },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
