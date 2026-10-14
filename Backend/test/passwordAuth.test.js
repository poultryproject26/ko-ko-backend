import assert from "node:assert/strict";
import test from "node:test";
import {
  canLoginWithPassword,
  initializePasswordWithOtp,
  isValidPhone,
  isValidPin,
} from "../utils/passwordAuth.js";

function makeModels({ password, otpExpired = false } = {}) {
  const otpRecords = ["012345", "543210"].map((code) => ({
    phone: "9876543210",
    code,
    used: false,
    expiresAt: new Date("2030-01-01"),
  }));
  const userRecord = { phone: "9876543210", role: "SHG Member", approved: true };
  if (password !== undefined) userRecord.password = password;

  const Otp = {
    async findOneAndUpdate(filter, update, options) {
      assert.equal(options.new, true);
      const now = filter.expiresAt.$gt;
      const otpRecord = otpRecords.find((record) =>
        record.phone === filter.phone &&
        record.code === filter.code &&
        record.used === filter.used &&
        record.expiresAt > now
      );
      if (!otpRecord || otpExpired) return null;

      otpRecord.used = update.$set.used;
      return otpRecord;
    },
  };

  const User = {
    async findOneAndUpdate(filter, update) {
      if (filter.phone !== userRecord.phone) return null;
      const matchesUnset = !("password" in userRecord) || userRecord.password === null || userRecord.password === "";
      if (!matchesUnset) return null;
      userRecord.password = update.$set.password;
      return userRecord;
    },
  };

  return { Otp, User, otpRecords, userRecord };
}

const bcrypt = {
  async hash(password, rounds) {
    assert.equal(rounds, 10);
    return `bcrypt:${password}`;
  },
};

test("validates phone and preserves four-digit strings with leading zeros", () => {
  assert.equal(isValidPhone("9876543210"), true);
  assert.equal(isValidPhone("98765"), false);
  assert.equal(isValidPin("0047"), true);
  assert.equal(isValidPin("47"), false);
  assert.equal(isValidPin(47), false);
});

test("rejects invalid or expired OTPs without setting a password", async () => {
  const models = makeModels({ otpExpired: true });
  const result = await initializePasswordWithOtp({
    ...models,
    bcrypt,
    phone: "9876543210",
    otp: "012345",
    password: "0047",
    now: new Date("2029-01-01"),
  });
  assert.equal(result.status, "invalid_otp");
  assert.equal(models.userRecord.password, undefined);
});

test("creates a bcrypt hash only after consuming a valid OTP", async () => {
  const models = makeModels();
  const result = await initializePasswordWithOtp({
    ...models,
    bcrypt,
    phone: "9876543210",
    otp: "012345",
    password: "0047",
    now: new Date("2029-01-01"),
  });
  assert.equal(result.status, "ok");
  assert.equal(models.otpRecords[0].used, true);
  assert.equal(models.userRecord.password, "bcrypt:0047");
});

test("does not overwrite an existing password", async () => {
  const models = makeModels({ password: "existing-hash" });
  const result = await initializePasswordWithOtp({
    ...models,
    bcrypt,
    phone: "9876543210",
    otp: "012345",
    password: "0047",
    now: new Date("2029-01-01"),
  });
  assert.equal(result.status, "unavailable");
  assert.equal(models.userRecord.password, "existing-hash");
});

test("allows only supported persisted roles and enforces farmer approval and CRP status", () => {
  assert.equal(canLoginWithPassword({ role: "ADMIN" }), true);
  assert.equal(canLoginWithPassword({ role: "CRP" }), true);
  assert.equal(canLoginWithPassword({ role: "CRP" }, true), false);
  assert.equal(canLoginWithPassword({ role: "SHG Member", approved: true }), true);
  assert.equal(canLoginWithPassword({ role: "SHG Member", approved: false }), false);
  assert.equal(canLoginWithPassword({ role: "BUYER", approved: true }), false);
});

test("concurrent setup attempts cannot consume one OTP or initialize twice", async () => {
  const models = makeModels();
  const setup = () => initializePasswordWithOtp({
    ...models,
    bcrypt,
    phone: "9876543210",
    otp: "012345",
    password: "0047",
    now: new Date("2029-01-01"),
  });
  const outcomes = await Promise.all([setup(), setup()]);
  assert.deepEqual(outcomes.map(({ status }) => status).sort(), ["invalid_otp", "ok"]);
  assert.equal(models.userRecord.password, "bcrypt:0047");
});

test("distinct OTPs cannot initialize the same account more than once concurrently", async () => {
  const models = makeModels();
  const setup = (otp, password) => initializePasswordWithOtp({
    ...models,
    bcrypt,
    phone: "9876543210",
    otp,
    password,
    now: new Date("2029-01-01"),
  });
  const outcomes = await Promise.all([setup("012345", "0047"), setup("543210", "9999")]);
  assert.equal(outcomes.filter(({ status }) => status === "ok").length, 1);
  assert.equal(outcomes.filter(({ status }) => status === "unavailable").length, 1);
  assert.ok(["bcrypt:0047", "bcrypt:9999"].includes(models.userRecord.password));
});
