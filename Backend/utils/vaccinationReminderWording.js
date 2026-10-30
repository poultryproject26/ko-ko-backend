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
                { $subtract: [{ $strLenCP: "$message" }, [...LEGACY_VACCINATION_REMINDER_FINAL_SENTENCE].length] },
              ],
            },
            CORRECT_VACCINATION_REMINDER_FINAL_SENTENCE,
          ],
        },
      },
    },
  ];
}
