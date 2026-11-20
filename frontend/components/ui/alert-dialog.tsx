"use client";

import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import type * as React from "react";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Confirmation dialog for destructive actions. The dialog stays open (with a
 * spinner state) until `onConfirm` resolves; it closes only on success.
 */
function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Supprimer",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  onConfirm: () => Promise<unknown>;
}) {
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
        <AlertDialogPrimitive.Overlay className="data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/40" />
        <AlertDialogPrimitive.Content className="bg-popover data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border p-6 shadow-lg duration-200">
          <div className="grid gap-2">
            <AlertDialogPrimitive.Title className="text-lg font-semibold tracking-tight">
              {title}
            </AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description className="text-muted-foreground text-sm">
              {description}
            </AlertDialogPrimitive.Description>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogPrimitive.Cancel className={cn(buttonVariants({ variant: "outline" }))}>
              Annuler
            </AlertDialogPrimitive.Cancel>
            <Button variant="destructive" onClick={confirm} disabled={pending}>
              {pending ? "Suppression…" : confirmLabel}
            </Button>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}

export { ConfirmDialog };
