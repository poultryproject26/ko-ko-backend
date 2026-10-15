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

export async function authenticateUserPassword({ user, password, bcrypt, inactiveCrp = false }) {
  if (!isValidPin(password) || !user?.password) return false;
  if (!(await bcrypt.compare(password, user.password))) return false;
  return canLoginWithPassword(user, inactiveCrp);
}

export async function hashPin(bcrypt, password) {
  if (!isValidPin(password)) return null;
  return bcrypt.hash(password, 10);
}

export async function setFarmerPassword({ User, bcrypt, farmerFilter, password }) {
  const passwordHash = await hashPin(bcrypt, password);
  if (!passwordHash) return { status: "invalid_pin" };

  const farmer = await User.findOneAndUpdate(
    farmerFilter,
    { $set: { password: passwordHash, approved: true } },
    { new: true, runValidators: true }
  );
  if (!farmer) return { status: "unavailable" };
  return { status: "ok", farmer };
}
