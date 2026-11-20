/**
 * Dates are stored in UTC by the API and always shown in Europe/Paris,
 * whatever the timezone of the browser.
 */
export const APP_TIME_ZONE = "Europe/Paris";
const LOCALE = "fr-FR";

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

type WallClock = { year: number; month: number; day: number; hour: number; minute: number };

function wallClock(date: Date): WallClock & { second: number } {
  const parts = Object.fromEntries(
    partsFormatter.formatToParts(date).map((p) => [p.type, p.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** Offset (ms) between Paris wall-clock time and UTC at a given instant. */
function parisOffset(timestamp: number): number {
  const w = wallClock(new Date(timestamp));
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  return asUtc - Math.floor(timestamp / 1000) * 1000;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO instant -> "YYYY-MM-DDTHH:mm" (Paris), the format of <input type="datetime-local">. */
export function toParisInputValue(iso: string): string {
  const w = wallClock(new Date(iso));
  return `${w.year}-${pad(w.month)}-${pad(w.day)}T${pad(w.hour)}:${pad(w.minute)}`;
}

/** "YYYY-MM-DDTHH:mm" read as Paris wall-clock time -> UTC ISO string. */
export function parisInputToIso(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) throw new Error(`Invalid datetime-local value: ${value}`);
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  // Two passes handle the days where Paris switches between UTC+1 and UTC+2.
  let timestamp = guess - parisOffset(guess);
  const corrected = guess - parisOffset(timestamp);
  if (corrected !== timestamp) timestamp = corrected;
  return new Date(timestamp).toISOString();
}

const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: APP_TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const longDateFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: APP_TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});
const timeFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: APP_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});
const dayFormatter = new Intl.DateTimeFormat(LOCALE, { timeZone: APP_TIME_ZONE, day: "numeric" });
const monthFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: APP_TIME_ZONE,
  month: "short",
});

/** "lun. 24 nov., 14:00" */
export const formatDateTime = (iso: string) => dateTimeFormatter.format(new Date(iso));
/** "jeudi 20 novembre" */
export const formatLongDate = (date: Date | string) => longDateFormatter.format(new Date(date));
/** "14:00" */
export const formatTime = (iso: string) => timeFormatter.format(new Date(iso));
/** { day: "24", month: "nov." } */
export const dayAndMonth = (iso: string) => ({
  day: dayFormatter.format(new Date(iso)),
  month: monthFormatter.format(new Date(iso)),
});

/** Number of calendar days (in Paris) between two instants. */
function calendarDayDiff(from: Date, to: Date): number {
  const a = wallClock(from);
  const b = wallClock(to);
  return Math.round(
    (Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / 86_400_000,
  );
}

const relativeFormatter = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });

/** "aujourd'hui à 14:00", "demain à 09:00", "dans 3 jours", "il y a 2 jours"... */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const days = calendarDayDiff(now, date);
  if (days === 0 || days === 1 || days === -1) {
    return `${relativeFormatter.format(days, "day")} à ${formatTime(iso)}`;
  }
  if (Math.abs(days) < 14) return relativeFormatter.format(days, "day");
  return relativeFormatter.format(Math.round(days / 7), "week");
}

/* ---------- Calendar days ("YYYY-MM-DD", Paris) for the week strip ---------- */

/** Calendar day in Paris of an instant, as "YYYY-MM-DD". */
export function parisDayKey(date: Date | string): string {
  const w = wallClock(new Date(date));
  return `${w.year}-${pad(w.month)}-${pad(w.day)}`;
}

/** Noon UTC of a day key: a safe anchor that falls on the same date in Paris. */
function keyToNoonUtc(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

export function addDays(key: string, days: number): string {
  const date = keyToNoonUtc(key);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Monday of the week containing `key`. */
export function startOfWeek(key: string): string {
  const weekday = (keyToNoonUtc(key).getUTCDay() + 6) % 7; // Monday = 0
  return addDays(key, -weekday);
}

/** Start of the day (00:00 Paris) as a UTC ISO instant. */
export const dayStartIso = (key: string) => parisInputToIso(`${key}T00:00`);

const weekdayFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: APP_TIME_ZONE,
  weekday: "short",
});
const monthYearFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: APP_TIME_ZONE,
  month: "long",
  year: "numeric",
});
const shortDayFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: APP_TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
});

/** "lun." */
export const weekdayShort = (key: string) => weekdayFormatter.format(keyToNoonUtc(key));
/** "23" */
export const dayOfMonth = (key: string) => String(Number(key.slice(8)));
/** "novembre 2026" */
export const monthYear = (key: string) => monthYearFormatter.format(keyToNoonUtc(key));
/** "lun. 23 nov." */
export const shortDay = (key: string) => shortDayFormatter.format(keyToNoonUtc(key));
