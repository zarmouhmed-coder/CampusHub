import { cn } from "@/lib/utils";

/** CampusHub crest: a shield holding an open book, crowned by a gold star. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={cn("size-9 shrink-0", className)}>
      <path
        d="M20 2.5 34.5 7v11.2c0 9.1-6 15.6-14.5 19.3C11.5 33.8 5.5 27.3 5.5 18.2V7L20 2.5Z"
        fill="oklch(0.29 0.085 266)"
      />
      <path
        d="M20 3.9 33.2 8v10.2c0 8.3-5.4 14.3-13.2 17.8C12.2 32.5 6.8 26.5 6.8 18.2V8L20 3.9Z"
        fill="none"
        stroke="oklch(1 0 0 / 0.14)"
      />
      <path
        d="M11 15.5c3.4-.9 6.4-.4 9 1.6v11.4c-2.6-1.9-5.6-2.5-9-1.6V15.5Zm18 0c-3.4-.9-6.4-.4-9 1.6v11.4c2.6-1.9 5.6-2.5 9-1.6V15.5Z"
        fill="oklch(0.98 0.005 262)"
      />
      <path d="M20 17.1v11.4" stroke="oklch(0.3 0.08 266)" strokeWidth="0.9" />
      <path
        d="m20 6.6.95 1.95 2.15.3-1.55 1.5.37 2.13L20 11.47l-1.92 1.01.37-2.13-1.55-1.5 2.15-.3L20 6.6Z"
        fill="oklch(0.78 0.12 82)"
      />
    </svg>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      {!compact && (
        <span className="font-display text-[1.2rem] font-semibold tracking-tight">CampusHub</span>
      )}
    </div>
  );
}
