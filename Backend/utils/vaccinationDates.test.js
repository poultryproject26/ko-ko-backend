import test from "node:test";
import assert from "node:assert/strict";
import {
  addKolkataCalendarDaysAsUtcDate,
  formatUtcCalendarDate,
} from "./vaccinationDates.js";

test("adds three Kolkata calendar days and stores the due date at UTC midnight", () => {
  const submittedAt = new Date("2026-10-30T15:00:00.000Z");
  const dueDate = addKolkataCalendarDaysAsUtcDate(submittedAt, 3);

  assert.equal(dueDate.toISOString(), "2026-11-02T00:00:00.000Z");
  assert.equal(formatUtcCalendarDate(dueDate), "02/11/2026");
});

test("uses the Kolkata submission date when UTC has already crossed midnight", () => {
  const submittedAt = new Date("2026-10-30T19:00:00.000Z");
  const dueDate = addKolkataCalendarDaysAsUtcDate(submittedAt, 3);

  assert.equal(dueDate.toISOString(), "2026-11-03T00:00:00.000Z");
});
