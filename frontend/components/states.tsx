import { AlertTriangle, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center",
        className,
      )}
    >
      <span className="bg-accent text-accent-foreground mb-3 grid size-10 place-items-center rounded-full">
        <Icon className="size-5" />
      </span>
      <p className="font-medium">{title}</p>
      {description && <p className="text-muted-foreground mt-1 max-w-sm text-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
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
  return (
    <div
      role="alert"
      className={cn(
        "border-destructive/20 bg-destructive/[0.03] flex flex-col items-center justify-center rounded-xl border px-6 py-10 text-center",
        className,
      )}
    >
      <AlertTriangle className="text-destructive mb-3 size-6" />
      <p className="font-medium">Impossible de charger les données</p>
      <p className="text-muted-foreground mt-1 text-sm">{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Réessayer
        </Button>
      )}
    </div>
  );
}

export function ListSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("grid gap-2", className)} aria-busy="true" aria-label="Chargement">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
