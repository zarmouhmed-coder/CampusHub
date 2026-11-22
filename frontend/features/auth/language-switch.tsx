"use client";

import { LOCALES, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** FR / EN switch for pages shown before sign-in. */
export function LanguageSwitch({ className }: { className?: string }) {
  const { t, locale, setLocale } = useI18n();
  return (
    <div
      role="radiogroup"
      aria-label={t.shell.language}
      className={cn("soft-inset inline-flex rounded-lg p-0.5", className)}
    >
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={l === locale}
          aria-label={t.languages[l]}
          onClick={() => setLocale(l)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-bold uppercase transition-colors",
            l === locale ? "bg-card text-foreground shadow-soft" : "text-muted-foreground",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
