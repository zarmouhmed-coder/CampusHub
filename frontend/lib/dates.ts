/**
 * Dates are stored in UTC by the API. They are displayed and entered in the
 * user's timezone (profile setting) and language. All helpers are pure; use
 * `useFormat()` (lib/use-format.ts) in components to get them pre-bound.
 */

const cache = new Map<string, Intl.DateTimeFormat>();
function formatter(locale: string, timeZone: string, options: Intl.DateTimeFormatOptions) {
  const key = `${locale}|${timeZone}|${JSON.stringify(options)}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, { timeZone, ...options });
    cache.set(key, f);
  }
  return f;
}

type WallClock = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function wallClock(date: Date, timeZone: string): WallClock {
  const parts = Object.fromEntries(
    formatter("en-US", timeZone, {
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
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

/** Offset (ms) between wall-clock time in `timeZone` and UTC at a given instant. */
function zoneOffset(timestamp: number, timeZone: string): number {
  const w = wallClock(new Date(timestamp), timeZone);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  return asUtc - Math.floor(timestamp / 1000) * 1000;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** The browser's timezone, used as a default at sign-up. */
export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

/** ISO instant -> "YYYY-MM-DDTHH:mm" in `timeZone` (value of <input type="datetime-local">). */
export function toZonedInputValue(iso: string, timeZone: string): string {
  const w = wallClock(new Date(iso), timeZone);
  return `${w.year}-${pad(w.month)}-${pad(w.day)}T${pad(w.hour)}:${pad(w.minute)}`;
}

/** "YYYY-MM-DDTHH:mm" read as wall-clock time in `timeZone` -> UTC ISO string. */
export function zonedInputToIso(value: string, timeZone: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) throw new Error(`Invalid datetime-local value: ${value}`);
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  // Two passes handle the days where the zone changes its UTC offset (DST).
  let timestamp = guess - zoneOffset(guess, timeZone);
  const corrected = guess - zoneOffset(timestamp, timeZone);
  if (corrected !== timestamp) timestamp = corrected;
  return new Date(timestamp).toISOString();
}

/** "lun. 24 nov., 14:00" / "Mon 24 Nov, 14:00" */
export const formatDateTime = (iso: string, locale: string, timeZone: string) =>
  formatter(locale, timeZone, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

/** "jeudi 20 novembre" */
export const formatLongDate = (date: Date | string, locale: string, timeZone: string) =>
  formatter(locale, timeZone, { weekday: "long", day: "numeric", month: "long" }).format(
    new Date(date),
  );

/** "14:00" */
export const formatTime = (iso: string, locale: string, timeZone: string) =>
  formatter(locale, timeZone, { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

/** { day: "24", month: "nov." } */
export const dayAndMonth = (iso: string, locale: string, timeZone: string) => ({
  day: formatter(locale, timeZone, { day: "numeric" }).format(new Date(iso)),
  month: formatter(locale, timeZone, { month: "short" }).format(new Date(iso)),
});

/* ---------- Calendar days ("YYYY-MM-DD" in the user's timezone) ---------- */

/** Calendar day of an instant in `timeZone`, as "YYYY-MM-DD". */
export function dayKey(date: Date | string, timeZone: string): string {
  const w = wallClock(new Date(date), timeZone);
  return `${w.year}-${pad(w.month)}-${pad(w.day)}`;
}

/** Noon UTC of a day key: formatting it in UTC always gives that calendar day. */
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

/** 00:00 of a calendar day in `timeZone`, as a UTC ISO instant. */
export const dayStartIso = (key: string, timeZone: string) =>
  zonedInputToIso(`${key}T00:00`, timeZone);

const formatKey = (key: string, locale: string, options: Intl.DateTimeFormatOptions) =>
  formatter(locale, "UTC", options).format(keyToNoonUtc(key));

/** "lun." / "Mon" */
export const weekdayShort = (key: string, locale: string) =>
  formatKey(key, locale, { weekday: "short" });
/** "23" */
export const dayOfMonth = (key: string) => String(Number(key.slice(8)));
/** "novembre 2026" */
export const monthYear = (key: string, locale: string) =>
  formatKey(key, locale, { month: "long", year: "numeric" });
/** "lun. 23 nov." */
export const shortDay = (key: string, locale: string) =>
  formatKey(key, locale, { weekday: "short", day: "numeric", month: "short" });

/** "aujourd'hui à 14:00", "demain à 09:00", "dans 3 jours", "il y a 2 jours"… */
export function formatRelative(
  iso: string,
  locale: string,
  timeZone: string,
  now: Date = new Date(),
): string {
  const days = Math.round(
    (keyToNoonUtc(dayKey(iso, timeZone)).getTime() -
      keyToNoonUtc(dayKey(now, timeZone)).getTime()) /
      86_400_000,
  );
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (Math.abs(days) <= 1) {
    const at = locale.startsWith("fr") ? "à" : "at";
    return `${relative.format(days, "day")} ${at} ${formatTime(iso, locale, timeZone)}`;
  }
  if (Math.abs(days) < 14) return relative.format(days, "day");
  return relative.format(Math.round(days / 7), "week");
}
