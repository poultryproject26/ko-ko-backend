import mongoose from "mongoose";
import User from "../models/User.js";

// CRP data scoping — the same rule GET /farmers already applies: a CRP login that
// is linked to a Crp profile (crpProfileId) only sees and acts on farmers whose
// crpId is that profile. Admins, and legacy CRP logins with no crpProfileId, are
// not restricted (unchanged from existing behavior).

// Returns the Crp profile id the caller is limited to, or null when unrestricted.
export async function getCrpScopeId(req) {
  if (String(req.user?.role || "").toUpperCase() !== "CRP") return null;
  const crpUser = await User.findById(req.user.userId, "crpProfileId");
  return crpUser?.crpProfileId || null;
}

// Filter on a record's `userId` limiting it to the caller's farmers ({} if unrestricted).
export async function crpRecordFilter(req) {
  const crpId = await getCrpScopeId(req);
  if (!crpId) return {};
  const farmerIds = await User.distinct("_id", { role: "SHG Member", crpId });
  return { userId: { $in: farmerIds } };
}

// Whether the caller may act on data belonging to `farmerId`. Only meaningful for
// routes that are already restricted to CRP/Admin.
export async function canAccessFarmer(req, farmerId) {
  const crpId = await getCrpScopeId(req);
  if (!crpId) return true;
  if (!farmerId || !mongoose.isValidObjectId(farmerId)) return false;
  const farmer = await User.findOne({ _id: farmerId, role: "SHG Member" }, "crpId");
  return !!farmer && String(farmer.crpId) === String(crpId);
}
