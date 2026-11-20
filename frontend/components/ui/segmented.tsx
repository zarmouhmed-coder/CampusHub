"use client";

import { cn } from "@/lib/utils";

/**
 * Single-choice filter rendered as pill chips (radio group semantics).
 * The selected chip is "ink" (near black); the row scrolls horizontally on mobile.
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
      className={cn("-mx-1 flex scrollbar-none gap-2 overflow-x-auto px-1 py-0.5", className)}
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
              "focus-visible:ring-ring flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:ring-[3px] focus-visible:outline-none",
              checked
                ? "bg-ink text-ink-foreground"
                : "bg-card text-muted-foreground shadow-card hover:text-foreground",
            )}
          >
            {option.label}
            {option.count !== undefined && option.count > 0 && (
              <span
                className={cn(
                  "grid min-w-5 place-items-center rounded-full px-1.5 text-[0.7rem] leading-5",
                  checked ? "bg-white/20" : "bg-secondary",
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
