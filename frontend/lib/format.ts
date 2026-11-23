"use client";

import { useCurrentUser } from "@/features/auth/api";
import { INTL_LOCALE, useI18n } from "@/lib/i18n";

/** Amounts in the institution's currency (XOF, NGN, KES, MAD…), in the user's language. */
export function useMoney() {
  const { locale } = useI18n();
  const { data: user } = useCurrentUser();
  const currency = user?.institution?.currency ?? "XOF";
  const formatter = new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  });
  return (value: number) => formatter.format(value);
}

/** "2026-11-23" → "23 nov. 2026" in the user's language. */
export function useDateOnly() {
  const { locale } = useI18n();
  const formatter = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  return (value: string | null) =>
    value ? formatter.format(new Date(`${value.slice(0, 10)}T12:00:00Z`)) : "—";
}

export function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(digits);
}
