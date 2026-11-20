import { describe, expect, it } from "vitest";

import {
  addDays,
  dayOfMonth,
  dayStartIso,
  formatRelative,
  monthYear,
  parisDayKey,
  parisInputToIso,
  startOfWeek,
  toParisInputValue,
  weekdayShort,
} from "./dates";

describe("Paris timezone conversion", () => {
  it("handles winter time (UTC+1)", () => {
    expect(parisInputToIso("2026-12-01T10:00")).toBe("2026-12-01T09:00:00.000Z");
    expect(toParisInputValue("2026-12-01T09:00:00Z")).toBe("2026-12-01T10:00");
  });

  it("handles summer time (UTC+2)", () => {
    expect(parisInputToIso("2026-07-14T23:59")).toBe("2026-07-14T21:59:00.000Z");
    expect(toParisInputValue("2026-07-14T21:59:00Z")).toBe("2026-07-14T23:59");
  });

  it("handles the days of the DST switches", () => {
    // 29 March 2026: clocks go from 02:00 to 03:00.
    expect(parisInputToIso("2026-03-29T01:30")).toBe("2026-03-29T00:30:00.000Z");
    expect(parisInputToIso("2026-03-29T03:30")).toBe("2026-03-29T01:30:00.000Z");
    // 25 October 2026: clocks go from 03:00 back to 02:00.
    expect(parisInputToIso("2026-10-25T04:00")).toBe("2026-10-25T03:00:00.000Z");
  });

  it("round-trips", () => {
    for (const value of ["2027-01-31T00:00", "2027-06-15T12:34", "2026-11-20T18:15"]) {
      expect(toParisInputValue(parisInputToIso(value))).toBe(value);
    }
  });
});

describe("formatRelative", () => {
  const now = new Date("2026-11-20T10:00:00Z"); // 11:00 in Paris

  it("uses calendar days in Paris", () => {
    expect(formatRelative("2026-11-20T16:00:00Z", now)).toBe("aujourd’hui à 17:00");
    expect(formatRelative("2026-11-21T08:00:00Z", now)).toBe("demain à 09:00");
    expect(formatRelative("2026-11-23T08:00:00Z", now)).toBe("dans 3 jours");
    expect(formatRelative("2026-11-18T08:00:00Z", now)).toBe("avant-hier");
    expect(formatRelative("2026-12-20T08:00:00Z", now)).toBe("dans 4 semaines");
  });
});

describe("calendar day helpers", () => {
  it("computes the Paris day of an instant", () => {
    // 23:30 UTC on the 21st is already the 22nd in Paris.
    expect(parisDayKey("2026-11-21T23:30:00Z")).toBe("2026-11-22");
  });

  it("finds the Monday of a week and adds days across months", () => {
    expect(startOfWeek("2026-11-22")).toBe("2026-11-16"); // Sunday -> Monday
    expect(startOfWeek("2026-11-16")).toBe("2026-11-16");
    expect(addDays("2026-11-30", 2)).toBe("2026-12-02");
  });

  it("gives day bounds in Paris time", () => {
    expect(dayStartIso("2026-11-23")).toBe("2026-11-22T23:00:00.000Z");
    expect(dayStartIso("2026-07-01")).toBe("2026-06-30T22:00:00.000Z");
  });

  it("formats labels in French", () => {
    expect(weekdayShort("2026-11-23")).toBe("lun.");
    expect(dayOfMonth("2026-11-03")).toBe("3");
    expect(monthYear("2026-11-23")).toBe("novembre 2026");
  });
});
