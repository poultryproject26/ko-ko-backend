const KOLKATA_TIME_ZONE = "Asia/Kolkata";

export function getKolkataCalendarDateParts(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: KOLKATA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

// Store date-only deadlines at UTC midnight; clients read the UTC date parts.
export function addKolkataCalendarDaysAsUtcDate(date, days) {
  const { year, month, day } = getKolkataCalendarDateParts(date);
  const deadline = new Date(Date.UTC(year, month - 1, day));
  deadline.setUTCDate(deadline.getUTCDate() + days);
  return deadline;
}

export function formatUtcCalendarDate(date) {
  const value = new Date(date);
  return `${String(value.getUTCDate()).padStart(2, "0")}/${String(value.getUTCMonth() + 1).padStart(2, "0")}/${value.getUTCFullYear()}`;
}
