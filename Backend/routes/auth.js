import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Otp from "../models/Otp.js";
import Hamlet from "../models/Hamlet.js";
import Street from "../models/Street.js";
import Crp from "../models/Crp.js";
import { notifyUsersByRole } from "../utils/notificationService.js";
import { verifyToken, requireAdmin } from "../middleware/auth.js";

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

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

function isValidPhone(phone) {
  return typeof phone === "string" && /^\d{10}$/.test(phone);
}

function isValidPin(password) {
  return typeof password === "string" && /^\d{4}$/.test(password);
}

function issueToken(user) {
  return jwt.sign(
    { userId: user._id, role: String(user.role || "").toUpperCase(), hamlet: user.hamlet },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

function authError(res) {
  return res.status(401).json({ message: "Invalid phone number or password" });
}

function loginAttemptKey(req, phone) {
  return `${req.ip || "unknown"}:${phone || "unknown"}`;
}

function getAttemptState(key) {
  const now = Date.now();
  const current = loginAttempts.get(key);
  if (!current || current.resetAt <= now) {
    const next = { count: 0, resetAt: now + LOGIN_WINDOW_MS };
    loginAttempts.set(key, next);
    return next;
  }
  return current;
}

function checkLoginLimit(req, res, phone) {
  const key = loginAttemptKey(req, phone);
  const state = getAttemptState(key);
  if (state.count < MAX_LOGIN_ATTEMPTS) return { limited: false, key, state };
  const retryAfter = Math.max(1, Math.ceil((state.resetAt - Date.now()) / 1000));
  res.set("Retry-After", String(retryAfter));
  res.status(429).json({ message: "Too many failed attempts. Please try again later.", retryAfter });
  return { limited: true, key, state };
}

function recordFailedLogin(key, state) {
  state.count += 1;
  loginAttempts.set(key, state);
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

// POST /api/auth/login — Generic phone + 4-digit password login for all roles.
// The app uses this for Farmer, CRP, and Admin accounts once password setup is complete.
router.post("/login", async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!isValidPhone(phone) || !isValidPin(password)) return authError(res);

    const limit = checkLoginLimit(req, res, phone);
    if (limit.limited) return;

    const user = await User.findOne({ phone }).populate("crpProfileId");
    if (!user || !user.password) {
      recordFailedLogin(limit.key, limit.state);
      return authError(res);
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      recordFailedLogin(limit.key, limit.state);
      return authError(res);
    }
    if (user.role === "SHG Member" && !user.approved) return res.status(403).json({ message: "pending", approved: false });
    if (await isInactiveCrp(user)) return res.status(403).json({ message: "This CRP account is inactive" });

    loginAttempts.delete(limit.key);

    res.json({ token: issueToken(user), user: toSafeUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/send-otp — Farmer OTP login
// POST /api/auth/password-status - used only to branch into first-time setup.
router.post("/password-status", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!isValidPhone(phone)) return res.status(400).json({ message: "Valid phone required" });
    const user = await User.findOne({ phone }, "password");
    res.json({ setupRequired: Boolean(user && !user.password) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/send-otp", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!isValidPhone(phone)) return res.status(400).json({ message: "Valid phone required" });

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await Otp.deleteMany({ phone });
    await Otp.create({ phone, code, expiresAt });

    res.json({ success: true, message: "OTP sent" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/setup-password - first-time password setup after OTP proof.
router.post("/setup-password", async (req, res) => {
  try {
    const { phone, otp, password } = req.body;
    if (!isValidPhone(phone) || typeof otp !== "string" || !isValidPin(password)) {
      return res.status(400).json({ message: "Invalid setup request" });
    }

    const record = await Otp.findOne({ phone, code: otp, used: false });
    if (!record || record.expiresAt < new Date()) return res.status(400).json({ message: "Invalid or expired OTP" });

    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.password) return res.status(409).json({ message: "Password is already set" });

    record.used = true;
    await record.save();

    user.password = await bcrypt.hash(password, 10);
    await user.save();

    res.json({ success: true });
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

    const user = await User.findOne({ phone }).populate("crpId", "name phone designation assignedLocation");
    if (!user) return res.status(404).json({ message: "User not found. Please register first." });
    if (user.role === "SHG Member" && !user.approved) return res.status(403).json({ message: "pending", approved: false });
    if (await isInactiveCrp(user)) return res.status(403).json({ message: "This CRP account is inactive" });

    res.json({ token: issueToken(user), user: toSafeUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { phone, name, hamletId, streetId, houseNo, shg_name } = req.body;
    if (!phone || !name || !shg_name) return res.status(400).json({ message: "Required fields missing" });

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
