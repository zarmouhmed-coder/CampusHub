import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function Stat({
  label,
  value,
  icon: Icon,
  tone = "default",
  hint,
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  tone?: "default" | "danger" | "gold" | "success";
  hint?: string;
}) {
  return (
    <div className="soft flex items-center gap-3 rounded-xl px-3.5 py-3">
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-lg",
          tone === "danger" && "bg-destructive/10 text-destructive",
          tone === "gold" && "bg-gold/15 text-gold-foreground",
          tone === "success" && "bg-success/12 text-success-foreground",
          tone === "default" && "bg-accent text-accent-foreground",
        )}
      >
        <Icon className="size-[1.05rem]" strokeWidth={1.9} />
      </span>
      <div className="min-w-0">
        <p
          className={cn(
            "font-display truncate leading-none font-semibold tabular-nums",
            // Long values (amounts in XOF, NGN…) get a smaller size instead of being cut.
            String(value).length > 9 ? "text-base" : "text-xl",
          )}
        >
          {value}
        </p>
        <p className="text-muted-foreground mt-1 truncate text-xs">{label}</p>
        {hint && <p className="text-muted-foreground/80 truncate text-[0.7rem]">{hint}</p>}
      </div>
    </div>
  );
}

export function StatGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6", className)}>
      {children}
    </div>
  );
}
