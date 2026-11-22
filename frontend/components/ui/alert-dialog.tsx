"use client";

import { AlertTriangle } from "lucide-react";
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import type * as React from "react";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { overlayClass } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Confirmation dialog for destructive actions. It stays open (with a pending
 * state) until `onConfirm` resolves, and closes only on success.
 */
function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  onConfirm: () => Promise<unknown>;
}) {
  const { t } = useI18n();
  const [pending, setPending] = useState(false);

  async function confirm() {
    setPending(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      // The caller reports the error (toast); keep the dialog open.
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className={overlayClass} />
        <AlertDialogPrimitive.Content className="glass-strong data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-5 rounded-2xl p-6 duration-200">
          <div className="flex gap-4">
            <span className="bg-destructive/10 text-destructive grid size-10 shrink-0 place-items-center rounded-xl">
              <AlertTriangle className="size-5" />
            </span>
            <div className="grid gap-1.5">
              <AlertDialogPrimitive.Title className="font-display text-lg font-semibold tracking-tight">
                {title}
              </AlertDialogPrimitive.Title>
              <AlertDialogPrimitive.Description className="text-muted-foreground text-sm">
                {description}
              </AlertDialogPrimitive.Description>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogPrimitive.Cancel className={cn(buttonVariants({ variant: "secondary" }))}>
              {t.common.cancel}
            </AlertDialogPrimitive.Cancel>
            <Button variant="destructive" onClick={confirm} disabled={pending}>
              {pending ? t.common.deleting : (confirmLabel ?? t.common.delete)}
            </Button>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}

export { ConfirmDialog };
