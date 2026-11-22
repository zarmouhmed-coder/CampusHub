"use client";

import { createContext, use, useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

import { en } from "./en";
import { fr, type Messages } from "./fr";

export type Locale = "fr" | "en";
export const LOCALES: readonly Locale[] = ["fr", "en"];
export const DEFAULT_LOCALE: Locale = "fr";
/** BCP 47 tags given to Intl (en-GB: 24-hour clock and day-month order). */
export const INTL_LOCALE: Record<Locale, string> = { fr: "fr-FR", en: "en-GB" };

const DICTIONARIES: Record<Locale, Messages> = { fr, en };
const COOKIE = "campushub_locale";

/* The chosen language lives in a cookie (readable by the server later) and, once
 * signed in, in the user's profile, which wins (see AppShell). */
const listeners = new Set<() => void>();

function readLocale(): Locale {
  const match = /(?:^|; )campushub_locale=(fr|en)/.exec(document.cookie);
  if (match) return match[1] as Locale;
  return navigator.language.toLowerCase().startsWith("en") ? "en" : DEFAULT_LOCALE;
}

export function storeLocale(locale: Locale) {
  document.cookie = `${COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => listeners.delete(notify);
}

type I18n = { locale: Locale; t: Messages; setLocale: (locale: Locale) => void };
const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Server render (static shell) uses the default language; the browser switches right after.
  const locale = useSyncExternalStore(subscribe, readLocale, () => DEFAULT_LOCALE);
  const setLocale = useCallback((next: Locale) => storeLocale(next), []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo(
    () => ({ locale, t: DICTIONARIES[locale], setLocale }),
    [locale, setLocale],
  );
  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n(): I18n {
  const context = use(I18nContext);
  if (!context) throw new Error("useI18n must be used inside <I18nProvider>");
  return context;
}
