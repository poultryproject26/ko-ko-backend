import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLegacyVaccinationReminderFilter,
  buildVaccinationReminderWordingUpdate,
  CORRECT_VACCINATION_REMINDER_FINAL_SENTENCE,
  LEGACY_VACCINATION_REMINDER_FINAL_SENTENCE,
} from "./vaccinationReminderWording.js";
import { VACCINATION_REMINDER_FINAL_SENTENCE } from "../routes/vaccinationStock.js";

test("new farmer vaccination reminders use the exact corrected Tamil final sentence", () => {
  assert.equal(VACCINATION_REMINDER_FINAL_SENTENCE, CORRECT_VACCINATION_REMINDER_FINAL_SENTENCE);
});

test("legacy wording migration targets only stock reminders ending in the old sentence", () => {
  const filter = buildLegacyVaccinationReminderFilter();
  const legacyPattern = new RegExp(filter.message.$regex);

  assert.equal(filter.type, "vaccination_stock_reminder");
  assert.equal(legacyPattern.test(`date\nquantity\n${LEGACY_VACCINATION_REMINDER_FINAL_SENTENCE}`), true);
  assert.equal(legacyPattern.test(`date\nquantity\n${CORRECT_VACCINATION_REMINDER_FINAL_SENTENCE}`), false);
  assert.equal(legacyPattern.test(`date\nquantity\n${LEGACY_VACCINATION_REMINDER_FINAL_SENTENCE}\nextra`), false);
});

test("migration update preserves message prefix and substitutes only the final sentence", () => {
  const [stage] = buildVaccinationReminderWordingUpdate();
  const expression = stage.$set.message.$concat;
  const [prefixExpression, replacement] = expression;
  const [source, start, lengthExpression] = prefixExpression.$substrCP;
  const subtraction = lengthExpression.$subtract;

  assert.equal(source, "$message");
  assert.equal(start, 0);
  assert.deepEqual(subtraction[0], { $strLenCP: "$message" });
  assert.equal(subtraction[1], [...LEGACY_VACCINATION_REMINDER_FINAL_SENTENCE].length);
  assert.equal(replacement, CORRECT_VACCINATION_REMINDER_FINAL_SENTENCE);
});

test("migration refuses writes without a separately supplied expected count", async () => {
  const { inspectOrMigrateVaccinationReminderWording } = await import(
    "../scripts/migrateVaccinationReminderWording.js"
  );
  await assert.rejects(
    inspectOrMigrateVaccinationReminderWording(["--apply"]),
    /requires --expected-count/,
  );
});
