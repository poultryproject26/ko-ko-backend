import { describe, expect, it } from "vitest";
import { isValidFourDigitPassword, isValidPhoneNumber, normalizePhone } from "@/lib/authValidation";

describe("auth validation", () => {
  it("accepts valid 10-digit phone numbers", () => {
    expect(isValidPhoneNumber("9876543210")).toBe(true);
    expect(isValidPhoneNumber(" 9876543210 ")).toBe(true);
  });

  it("rejects invalid phone numbers", () => {
    expect(isValidPhoneNumber("123")).toBe(false);
    expect(isValidPhoneNumber("abcdefghij")).toBe(false);
  });

  it("accepts four-digit passwords including leading zeros", () => {
    expect(isValidFourDigitPassword("0047")).toBe(true);
    expect(isValidFourDigitPassword("0000")).toBe(true);
  });

  it("rejects invalid four-digit passwords", () => {
    expect(isValidFourDigitPassword("123")).toBe(false);
    expect(isValidFourDigitPassword("12345")).toBe(false);
    expect(isValidFourDigitPassword("abcd")).toBe(false);
  });

  it("normalizes phone numbers by stripping non-digits", () => {
    expect(normalizePhone("+91 98765 43210")).toBe("9876543210");
  });
});
