import assert from "node:assert/strict";
import test from "node:test";
import {
  authenticateUserPassword,
  canLoginWithPassword,
  hashPin,
  isValidPhone,
  isValidPin,
  setFarmerPassword,
} from "../utils/passwordAuth.js";

test("validates phone numbers and string PINs, preserving leading zeroes", () => {
  assert.equal(isValidPhone("9876543210"), true);
  assert.equal(isValidPhone("987654321"), false);
  assert.equal(isValidPhone("98765x3210"), false);
  assert.equal(isValidPin("0047"), true);
  assert.equal(isValidPin("0000"), true);
  assert.equal(isValidPin("47"), false);
  assert.equal(isValidPin("12345"), false);
  assert.equal(isValidPin(47), false);
});

test("hashes only valid four-digit strings with bcrypt", async () => {
  const calls = [];
  const bcrypt = {
    async hash(password, rounds) {
      calls.push({ password, rounds });
      return "bcrypt-hash";
    },
  };

  assert.equal(await hashPin(bcrypt, "0047"), "bcrypt-hash");
  assert.deepEqual(calls, [{ password: "0047", rounds: 10 }]);
  assert.equal(await hashPin(bcrypt, "47"), null);
  assert.equal(calls.length, 1);
});

test("allows only approved Farmer, active CRP, and Admin roles", () => {
  assert.equal(canLoginWithPassword({ role: "ADMIN" }), true);
  assert.equal(canLoginWithPassword({ role: "CRP" }), true);
  assert.equal(canLoginWithPassword({ role: "CRP" }, true), false);
  assert.equal(canLoginWithPassword({ role: "SHG Member", approved: true }), true);
  assert.equal(canLoginWithPassword({ role: "SHG Member", approved: false }), false);
  assert.equal(canLoginWithPassword({ role: "BUYER", approved: true }), false);
});

test("authenticates persisted roles by four-digit string and rejects invalid passwords", async () => {
  const bcrypt = {
    async compare(candidate, hash) {
      return candidate === "0047" && hash === "stored-hash";
    },
  };
  const accounts = [
    { role: "SHG Member", approved: true },
    { role: "CRP" },
    { role: "ADMIN" },
  ];

  for (const user of accounts) {
    user.password = "stored-hash";
    assert.equal(await authenticateUserPassword({ user, password: "0047", bcrypt }), true);
    assert.equal(await authenticateUserPassword({ user, password: "0048", bcrypt }), false);
    assert.equal(await authenticateUserPassword({ user, password: 47, bcrypt }), false);
  }
  assert.equal(await authenticateUserPassword({ user: null, password: "0047", bcrypt }), false);
  assert.equal(
    await authenticateUserPassword({ user: { role: "SHG Member", approved: false, password: "stored-hash" }, password: "0047", bcrypt }),
    false
  );
  assert.equal(
    await authenticateUserPassword({ user: { role: "CRP", password: "stored-hash" }, password: "0047", bcrypt, inactiveCrp: true }),
    false
  );
  assert.equal(
    await authenticateUserPassword({ user: { role: "ADMIN", password: "stored-hash" }, password: "0047", bcrypt, inactiveCrp: true }),
    true
  );
});

test("staff enrollment stores only a bcrypt hash and approves the Farmer", async () => {
  let query;
  let update;
  const User = {
    async findOneAndUpdate(filter, changes, options) {
      query = filter;
      update = changes;
      assert.equal(options.runValidators, true);
      return { _id: "farmer-id", role: "SHG Member", approved: true };
    },
  };
  const bcrypt = {
    async hash(password, rounds) {
      assert.equal(password, "0047");
      assert.equal(rounds, 10);
      return "bcrypt-hash";
    },
  };

  const farmerFilter = { _id: "farmer-id", role: "SHG Member", crpId: "assigned-crp-id" };
  const result = await setFarmerPassword({ User, bcrypt, farmerFilter, password: "0047" });

  assert.equal(result.status, "ok");
  assert.deepEqual(query, farmerFilter);
  assert.deepEqual(update, { $set: { password: "bcrypt-hash", approved: true } });
  assert.equal("password" in result.farmer, false);
});

test("rejects invalid PINs before modifying a Farmer", async () => {
  let updateCalled = false;
  const User = {
    async findOneAndUpdate() {
      updateCalled = true;
      return null;
    },
  };
  const result = await setFarmerPassword({
    User,
    bcrypt: { hash: async () => "unused" },
    farmerFilter: { _id: "farmer-id", role: "SHG Member" },
    password: "abc4",
  });
  assert.equal(result.status, "invalid_pin");
  assert.equal(updateCalled, false);
});

test("returns unavailable when the requested account is not a Farmer", async () => {
  const result = await setFarmerPassword({
    User: { findOneAndUpdate: async () => null },
    bcrypt: { hash: async () => "bcrypt-hash" },
    farmerFilter: { _id: "not-a-farmer", role: "SHG Member" },
    password: "0047",
  });
  assert.equal(result.status, "unavailable");
});
