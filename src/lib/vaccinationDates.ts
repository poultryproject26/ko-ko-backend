const KOLKATA_TIME_ZONE = "Asia/Kolkata";

type VaccinationStockDates = {
  dueDate?: string | Date | null;
  entryDate?: string | Date | null;
};

function formatDateParts(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function kolkataDateString(value: string | Date): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: KOLKATA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return formatDateParts(Number(values.year), Number(values.month), Number(values.day));
}

export function getKolkataTodayCalendarDate(now = new Date()): string {
  return kolkataDateString(now) ?? "";
}

function addCalendarDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const result = new Date(Date.UTC(year, month - 1, day));
  result.setUTCDate(result.getUTCDate() + days);
  return formatDateParts(result.getUTCFullYear(), result.getUTCMonth() + 1, result.getUTCDate());
}

export function getVaccinationStockDueDate(stock: VaccinationStockDates): string | null {
  if (stock.dueDate) {
    if (typeof stock.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(stock.dueDate)) {
      return stock.dueDate;
    }

    const storedDate = new Date(stock.dueDate);
    if (!Number.isNaN(storedDate.getTime())) {
      return formatDateParts(
        storedDate.getUTCFullYear(),
        storedDate.getUTCMonth() + 1,
        storedDate.getUTCDate(),
      );
    }
  }

  if (!stock.entryDate) return null;
  const submittedDate = kolkataDateString(stock.entryDate);
  return submittedDate ? addCalendarDays(submittedDate, 3) : null;
}

export function isVaccinationStockPendingOnDate(
  stock: VaccinationStockDates & { status?: string | null },
  selectedDate: string,
): boolean {
  return stock.status === "pending" && getVaccinationStockDueDate(stock) === selectedDate;
}

export function formatVaccinationCalendarDate(date: string | null): string {
  if (!date) return "—";
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return "—";
  return `${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}-${year}`;
}

export function formatVaccinationSubmissionDate(value?: string | Date | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: KOLKATA_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
