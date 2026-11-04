import { describe, expect, it } from "vitest";
import {
  formatVaccinationCalendarDate,
  formatVaccinationSubmissionDate,
  getKolkataTodayCalendarDate,
  getVaccinationStockDueDate,
  isVaccinationStockPendingOnDate,
} from "@/lib/vaccinationDates";

describe("vaccination stock dates", () => {
  it("uses the stored due date as a calendar date without timezone shifting", () => {
    expect(getVaccinationStockDueDate({
      dueDate: "2026-11-02T00:00:00.000Z",
      entryDate: "2026-10-30T15:00:00.000Z",
    })).toBe("2026-11-02");
    expect(formatVaccinationCalendarDate("2026-11-02")).toBe("02-11-2026");
  });

  it("falls back to entryDate plus three Kolkata calendar days for legacy records", () => {
    expect(getVaccinationStockDueDate({
      entryDate: "2026-10-30T15:00:00.000Z",
    })).toBe("2026-11-02");
  });

  it("uses the Kolkata submission date when a UTC timestamp falls on the next local day", () => {
    expect(getVaccinationStockDueDate({
      entryDate: "2026-10-30T19:00:00.000Z",
    })).toBe("2026-11-03");
  });

  it("formats request submission timestamps in the Kolkata timezone", () => {
    expect(formatVaccinationSubmissionDate("2026-10-30T19:00:00.000Z"))
      .toBe("31 Oct 2026, 00:30");
  });

  it("uses the Kolkata calendar date for the date picker default", () => {
    expect(getKolkataTodayCalendarDate(new Date("2026-10-30T19:00:00.000Z")))
      .toBe("2026-10-31");
  });

  it("matches only pending requests due on the selected calendar date", () => {
    const pending = {
      status: "pending",
      dueDate: "2026-11-02T00:00:00.000Z",
    };
    expect(isVaccinationStockPendingOnDate(pending, "2026-11-02")).toBe(true);
    expect(isVaccinationStockPendingOnDate(pending, "2026-11-03")).toBe(false);
    expect(isVaccinationStockPendingOnDate(
      { ...pending, status: "completed" },
      "2026-11-02",
    )).toBe(false);
  });

  it("uses the legacy entryDate fallback when matching pending requests", () => {
    expect(isVaccinationStockPendingOnDate({
      status: "pending",
      entryDate: "2026-10-30T15:00:00.000Z",
    }, "2026-11-02")).toBe(true);
  });
});
