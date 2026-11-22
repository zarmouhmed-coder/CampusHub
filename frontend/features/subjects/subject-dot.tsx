"use client";

import type { LucideIcon } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { SubjectSummary } from "@/types/api";

export function SubjectDot({ color, className }: { color: string | null; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("bg-muted-foreground/40 inline-block size-2 shrink-0 rounded-full", className)}
      style={color ? { backgroundColor: color } : undefined}
    />
  );
}

export function SubjectLabel({ subject }: { subject: SubjectSummary | null }) {
  const { t } = useI18n();
  if (!subject) return <span className="text-muted-foreground">{t.common.noSubject}</span>;
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <SubjectDot color={subject.color} />
      <span className="truncate">{subject.name}</span>
    </span>
  );
}

/** Rounded square tinted with the subject colour (12% background, full-colour icon). */
export function SubjectTile({
  color,
  icon: Icon,
  className,
  children,
}: {
  color: string | null | undefined;
  icon?: LucideIcon;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "bg-secondary text-muted-foreground grid size-10 shrink-0 place-items-center rounded-xl",
        className,
      )}
      style={color ? { backgroundColor: `${color}1f`, color } : undefined}
    >
      {Icon ? <Icon className="size-[1.15rem]" strokeWidth={1.9} /> : children}
    </span>
  );
}
