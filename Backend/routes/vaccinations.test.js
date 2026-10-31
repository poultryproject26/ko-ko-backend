import test from "node:test";
import assert from "node:assert/strict";
import router from "./vaccinations.js";
import BirdBatch from "../models/BirdBatch.js";
import Vaccination from "../models/Vaccination.js";
import User from "../models/User.js";

test("creating a batch stores the batch without inserting automatic vaccinations", async () => {
  const route = router.stack.find((layer) =>
    layer.route?.path === "/batches" && layer.route.methods.post
  )?.route;
  assert.ok(route, "batch creation route exists");

  const handler = route.stack.at(-1).handle;
  const originals = {
    findById: User.findById,
    createBatch: BirdBatch.create,
    insertMany: Vaccination.insertMany,
  };
  let createdBatch;
  let insertedVaccinations = false;

  User.findById = async () => ({ crpProfileId: null });
  BirdBatch.create = async (data) => {
    createdBatch = data;
    return { ...data, _id: "batch-id" };
  };
  Vaccination.insertMany = async () => {
    insertedVaccinations = true;
    throw new Error("Batch creation must not insert vaccination events");
  };

  const response = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  try {
    await handler({
      user: { role: "CRP", userId: "crp-user-id" },
      body: {
        userId: "farmer-id",
        batchName: "Batch 1",
        numberOfChicks: 12,
        batchDate: "2026-10-30",
      },
    }, response);

    assert.equal(response.statusCode, 201);
    assert.equal(createdBatch.userId, "farmer-id");
    assert.equal(createdBatch.numberOfChicks, 12);
    assert.equal(response.body.scheduleCount, 0);
    assert.equal(insertedVaccinations, false);
  } finally {
    User.findById = originals.findById;
    BirdBatch.create = originals.createBatch;
    Vaccination.insertMany = originals.insertMany;
  }
});
