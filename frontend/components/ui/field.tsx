import type * as React from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Label + control + hint/error, with the right aria wiring. */
function Field({
  id,
  label,
  error,
  hint,
  optional,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {optional && <span className="text-muted-foreground text-xs font-normal">facultatif</span>}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-destructive text-[0.8rem]">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-muted-foreground text-[0.8rem]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Props to spread on the control of a <Field>. */
function fieldA11y(id: string, error?: string) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : undefined,
  } as const;
}

function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="bg-destructive/8 text-destructive rounded-xl px-3.5 py-2.5 text-sm font-medium"
    >
      {message}
    </div>
  );
}

export { Field, fieldA11y, FormError };
