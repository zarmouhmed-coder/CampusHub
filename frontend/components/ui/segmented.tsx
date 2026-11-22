"use client";

import { cn } from "@/lib/utils";

/**
 * Soft UI segmented control (radio group semantics): a recessed track with a
 * raised "thumb" on the selected option. Scrolls horizontally on small screens.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string; count?: number }[];
  label: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "soft-inset inline-flex max-w-full scrollbar-none gap-0.5 overflow-x-auto rounded-xl p-1",
        className,
      )}
    >
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(option.value)}
            className={cn(
              "focus-visible:ring-ring flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[0.8rem] font-semibold whitespace-nowrap transition-all duration-200 focus-visible:ring-[3px] focus-visible:outline-none",
              checked
                ? "bg-card text-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
            {option.count !== undefined && option.count > 0 && (
              <span
                className={cn(
                  "grid min-w-5 place-items-center rounded-full px-1.5 text-[0.68rem] leading-[1.15rem] tabular-nums",
                  checked ? "bg-primary text-primary-foreground" : "bg-secondary",
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
