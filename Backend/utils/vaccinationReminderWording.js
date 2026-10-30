export const LEGACY_VACCINATION_REMINDER_FINAL_SENTENCE =
  "தடுப்பூசி போட வேண்டிய கோழிகளை இந்நாள் அடைவாக வையுங்கள்.";
export const CORRECT_VACCINATION_REMINDER_FINAL_SENTENCE =
  "தடுப்பூசி போட வேண்டிய கோழிகளை இந்நாளில் அடைத்து வைக்கவும்.";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildLegacyVaccinationReminderFilter() {
  return {
    type: "vaccination_stock_reminder",
    message: { $regex: `${escapeRegex(LEGACY_VACCINATION_REMINDER_FINAL_SENTENCE)}$` },
  };
}

export function buildVaccinationReminderWordingUpdate() {
  return [
    {
      $set: {
        message: {
          $concat: [
            {
              $substrCP: [
                "$message",
                0,
                {
                  $subtract: [
                    { $strLenCP: "$message" },
                    [...LEGACY_VACCINATION_REMINDER_FINAL_SENTENCE].length,
                  ],
                },
              ],
            },
            CORRECT_VACCINATION_REMINDER_FINAL_SENTENCE,
          ],
        },
      },
    },
  ];
}

export function parseVaccinationReminderMigrationArgs(args) {
  const apply = args.includes("--apply");
  const expectedArg = args.find((arg) => arg.startsWith("--expected-count="));
  const expectedCount = expectedArg ? Number(expectedArg.split("=")[1]) : null;

  if (apply && (!Number.isInteger(expectedCount) || expectedCount < 0)) {
    throw new Error("--apply requires --expected-count=<count> from a prior dry run");
  }

  return { apply, expectedCount };
}
