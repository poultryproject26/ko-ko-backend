export function normalizePhone(phone: string): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("91")) {
    return digits.slice(2, 12);
  }
  return digits.slice(0, 10);
}

export function isValidPhoneNumber(phone: string): boolean {
  return typeof phone === "string" && /^\d{10}$/.test(phone.trim());
}

export function isValidFourDigitPassword(password: string): boolean {
  return typeof password === "string" && /^\d{4}$/.test(password);
}
