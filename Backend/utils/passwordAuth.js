export function isValidPhone(phone) {
  return typeof phone === "string" && /^\d{10}$/.test(phone);
}

export function isValidPin(password) {
  return typeof password === "string" && /^\d{4}$/.test(password);
}

export function canLoginWithPassword(user, inactiveCrp = false) {
  const role = String(user?.role || "").toUpperCase();
  if (role === "ADMIN") return true;
  if (role === "CRP") return !inactiveCrp;
  if (role === "SHG MEMBER") return user.approved === true;
  return false;
}

export async function initializePasswordWithOtp({ Otp, User, bcrypt, phone, otp, password, now = new Date() }) {
  if (!isValidPhone(phone) || typeof otp !== "string" || !/^\d{6}$/.test(otp) || !isValidPin(password)) {
    return { status: "invalid_request" };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const consumedOtp = await Otp.findOneAndUpdate(
    { phone, code: otp, used: false, expiresAt: { $gt: now } },
    { $set: { used: true } },
    { new: true }
  );
  if (!consumedOtp) return { status: "invalid_otp" };

  const user = await User.findOneAndUpdate(
    {
      phone,
      $or: [
        { password: { $exists: false } },
        { password: null },
        { password: "" },
      ],
    },
    { $set: { password: passwordHash } },
    { new: true, runValidators: true }
  );
  if (!user) return { status: "unavailable" };

  return { status: "ok", user };
}
