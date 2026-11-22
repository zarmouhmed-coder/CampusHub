"use client";

import { AlertTriangle, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Small academic illustration: the icon on a soft medallion with a gold accent. */
function Medallion({
  icon: Icon,
  tone = "primary",
}: {
  icon: LucideIcon;
  tone?: "primary" | "danger";
}) {
  return (
    <span className="relative mb-4 grid size-14 place-items-center">
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 rotate-6 rounded-2xl",
          tone === "danger" ? "bg-destructive/10" : "bg-accent",
        )}
      />
      <span
        className={cn(
          "soft relative grid size-12 place-items-center rounded-xl",
          tone === "danger" ? "text-destructive" : "text-primary",
        )}
      >
        <Icon className="size-[1.35rem]" strokeWidth={1.75} />
      </span>
      {tone === "primary" && (
        <span aria-hidden className="bg-gold absolute -top-0.5 -right-0.5 size-2.5 rounded-full" />
      )}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  bare = false,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  /** Inside a card: no surface of its own. */
  bare?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl px-6 py-10 text-center",
        !bare && "soft",
        className,
      )}
    >
      <Medallion icon={icon} />
      <p className="font-semibold">{title}</p>
      {description && <p className="text-muted-foreground mt-1 max-w-sm text-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <div
      role="alert"
      className={cn(
        "soft flex flex-col items-center justify-center rounded-2xl px-6 py-10 text-center",
        className,
      )}
    >
      <Medallion icon={AlertTriangle} tone="danger" />
      <p className="font-semibold">{t.common.loadErrorTitle}</p>
      <p className="text-muted-foreground mt-1 text-sm">{errorMessage(error, t)}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
          {t.common.retry}
        </Button>
      )}
    </div>
  );
}

export function ListSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  const { t } = useI18n();
  return (
    <div className={cn("grid gap-2", className)} aria-busy="true" aria-label={t.common.loading}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  meta,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  /** Small line above the title (e.g. a count or a date). */
  meta?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {meta && (
          <p className="text-gold-foreground mb-1 text-xs font-semibold tracking-wider uppercase">
            {meta}
          </p>
        )}
        <h1 className="font-display text-[1.7rem] leading-tight font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        {description && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
