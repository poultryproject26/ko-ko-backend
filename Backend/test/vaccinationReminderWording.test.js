import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildLegacyVaccinationReminderFilter,
  buildVaccinationReminderWordingUpdate,
  CORRECT_VACCINATION_REMINDER_FINAL_SENTENCE,
  LEGACY_VACCINATION_REMINDER_FINAL_SENTENCE,
  parseVaccinationReminderMigrationArgs,
} from "../utils/vaccinationReminderWording.js";

test("vaccination request producer uses the exact corrected Tamil final sentence", async () => {
  const route = await readFile(new URL("../routes/vaccinationStock.js", import.meta.url), "utf8");
  assert.equal(
    CORRECT_VACCINATION_REMINDER_FINAL_SENTENCE,
    "தடுப்பூசி போட வேண்டிய கோழிகளை இந்நாளில் அடைத்து வைக்கவும்.",
  );
  assert.match(route, /CORRECT_VACCINATION_REMINDER_FINAL_SENTENCE/);
  assert.doesNotMatch(route, /தடுப்பூசி போட வேண்டிய கோழிகளை இந்நாள் அடைவாக வையுங்கள்/);
});

test("migration filters only stock reminders ending in the legacy sentence", () => {
  const filter = buildLegacyVaccinationReminderFilter();
  const legacyPattern = new RegExp(filter.message.$regex);

  assert.equal(filter.type, "vaccination_stock_reminder");
  assert.equal(legacyPattern.test(`date\nquantities\n${LEGACY_VACCINATION_REMINDER_FINAL_SENTENCE}`), true);
  assert.equal(legacyPattern.test(`date\nquantities\n${CORRECT_VACCINATION_REMINDER_FINAL_SENTENCE}`), false);
  assert.equal(legacyPattern.test(`date\n${LEGACY_VACCINATION_REMINDER_FINAL_SENTENCE}\nextra`), false);
});

test("migration pipeline preserves the message prefix and changes only the final sentence", () => {
  const [stage] = buildVaccinationReminderWordingUpdate();
  const [prefixExpression, replacement] = stage.$set.message.$concat;
  const [source, start, lengthExpression] = prefixExpression.$substrCP;
  const [messageLength, oldSuffixLength] = lengthExpression.$subtract;

  assert.equal(source, "$message");
  assert.equal(start, 0);
  assert.deepEqual(messageLength, { $strLenCP: "$message" });
  assert.equal(oldSuffixLength, [...LEGACY_VACCINATION_REMINDER_FINAL_SENTENCE].length);
  assert.equal(replacement, CORRECT_VACCINATION_REMINDER_FINAL_SENTENCE);
});

test("apply requires an explicit expected count from the dry run", () => {
  assert.deepEqual(parseVaccinationReminderMigrationArgs([]), { apply: false, expectedCount: null });
  assert.throws(() => parseVaccinationReminderMigrationArgs(["--apply"]), /requires --expected-count/);
  assert.throws(() => parseVaccinationReminderMigrationArgs(["--apply", "--expected-count=1.5"]), /requires --expected-count/);
  assert.deepEqual(
    parseVaccinationReminderMigrationArgs(["--apply", "--expected-count=3"]),
    { apply: true, expectedCount: 3 },
  );
});

test("migration is not invoked during server startup", async () => {
  const server = await readFile(new URL("../server.js", import.meta.url), "utf8");
  assert.doesNotMatch(server, /migrateVaccinationReminderWording/);
});
