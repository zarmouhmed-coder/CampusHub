"use client";

import { useMemo } from "react";

import { useCurrentUser } from "@/features/auth/api";
import {
  browserTimeZone,
  dayAndMonth,
  dayKey,
  dayStartIso,
  formatDateTime,
  formatLongDate,
  formatRelative,
  formatTime,
  monthYear,
  shortDay,
  toZonedInputValue,
  weekdayShort,
  zonedInputToIso,
} from "@/lib/dates";
import { INTL_LOCALE, useI18n } from "@/lib/i18n";

/** Date helpers bound to the user's language and timezone (from the profile). */
export function useFormat() {
  const { locale } = useI18n();
  const { data: user } = useCurrentUser();
  const timeZone = user?.timezone ?? browserTimeZone();
  const intl = INTL_LOCALE[locale];

  return useMemo(
    () => ({
      timeZone,
      dateTime: (iso: string) => formatDateTime(iso, intl, timeZone),
      longDate: (date: Date | string) => formatLongDate(date, intl, timeZone),
      time: (iso: string) => formatTime(iso, intl, timeZone),
      dayMonth: (iso: string) => dayAndMonth(iso, intl, timeZone),
      relative: (iso: string) => formatRelative(iso, intl, timeZone),
      dayKey: (date: Date | string) => dayKey(date, timeZone),
      dayStart: (key: string) => dayStartIso(key, timeZone),
      toInput: (iso: string) => toZonedInputValue(iso, timeZone),
      fromInput: (value: string) => zonedInputToIso(value, timeZone),
      weekday: (key: string) => weekdayShort(key, intl),
      monthYear: (key: string) => monthYear(key, intl),
      shortDay: (key: string) => shortDay(key, intl),
    }),
    [intl, timeZone],
  );
}

export type Format = ReturnType<typeof useFormat>;
