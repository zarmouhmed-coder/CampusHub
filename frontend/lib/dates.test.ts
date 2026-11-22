import { describe, expect, it } from "vitest";

import {
  addDays,
  dayKey,
  dayOfMonth,
  dayStartIso,
  formatRelative,
  monthYear,
  startOfWeek,
  toZonedInputValue,
  weekdayShort,
  zonedInputToIso,
} from "./dates";

const PARIS = "Europe/Paris";

describe("timezone conversion", () => {
  it("handles Paris winter and summer time", () => {
    expect(zonedInputToIso("2026-12-01T10:00", PARIS)).toBe("2026-12-01T09:00:00.000Z");
    expect(toZonedInputValue("2026-12-01T09:00:00Z", PARIS)).toBe("2026-12-01T10:00");
    expect(zonedInputToIso("2026-07-14T23:59", PARIS)).toBe("2026-07-14T21:59:00.000Z");
  });

  it("handles the days of the DST switches", () => {
    expect(zonedInputToIso("2026-03-29T01:30", PARIS)).toBe("2026-03-29T00:30:00.000Z");
    expect(zonedInputToIso("2026-03-29T03:30", PARIS)).toBe("2026-03-29T01:30:00.000Z");
    expect(zonedInputToIso("2026-10-25T04:00", PARIS)).toBe("2026-10-25T03:00:00.000Z");
  });

  it("works for African timezones", () => {
    expect(zonedInputToIso("2026-11-23T08:00", "Africa/Dakar")).toBe("2026-11-23T08:00:00.000Z");
    expect(zonedInputToIso("2026-11-23T08:00", "Africa/Nairobi")).toBe("2026-11-23T05:00:00.000Z");
    expect(zonedInputToIso("2026-11-23T08:00", "Africa/Lagos")).toBe("2026-11-23T07:00:00.000Z");
  });

  it("round-trips", () => {
    for (const value of ["2027-01-31T00:00", "2027-06-15T12:34", "2026-11-20T18:15"]) {
      expect(toZonedInputValue(zonedInputToIso(value, PARIS), PARIS)).toBe(value);
    }
  });
});

describe("formatRelative", () => {
  const now = new Date("2026-11-20T10:00:00Z");

  it("uses calendar days in the user's timezone, in French and English", () => {
    expect(formatRelative("2026-11-20T16:00:00Z", "fr-FR", PARIS, now)).toBe("aujourd’hui à 17:00");
    expect(formatRelative("2026-11-21T08:00:00Z", "fr-FR", PARIS, now)).toBe("demain à 09:00");
    expect(formatRelative("2026-11-23T08:00:00Z", "fr-FR", PARIS, now)).toBe("dans 3 jours");
    expect(formatRelative("2026-11-21T08:00:00Z", "en-GB", PARIS, now)).toBe("tomorrow at 09:00");
    expect(formatRelative("2026-11-23T08:00:00Z", "en-GB", PARIS, now)).toBe("in 3 days");
  });
});

describe("calendar day helpers", () => {
  it("computes the calendar day of an instant in a timezone", () => {
    expect(dayKey("2026-11-21T23:30:00Z", PARIS)).toBe("2026-11-22");
    expect(dayKey("2026-11-21T23:30:00Z", "Africa/Dakar")).toBe("2026-11-21");
  });

  it("finds the Monday of a week and adds days across months", () => {
    expect(startOfWeek("2026-11-22")).toBe("2026-11-16");
    expect(startOfWeek("2026-11-16")).toBe("2026-11-16");
    expect(addDays("2026-11-30", 2)).toBe("2026-12-02");
  });

  it("gives day bounds in the user's timezone", () => {
    expect(dayStartIso("2026-11-23", PARIS)).toBe("2026-11-22T23:00:00.000Z");
    expect(dayStartIso("2026-11-23", "Africa/Nairobi")).toBe("2026-11-22T21:00:00.000Z");
  });

  it("formats day labels in French and English", () => {
    expect(weekdayShort("2026-11-23", "fr-FR")).toBe("lun.");
    expect(weekdayShort("2026-11-23", "en-GB")).toBe("Mon");
    expect(dayOfMonth("2026-11-03")).toBe("3");
    expect(monthYear("2026-11-23", "fr-FR")).toBe("novembre 2026");
    expect(monthYear("2026-11-23", "en-GB")).toBe("November 2026");
  });
});
