import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap [&>svg]:size-3",
  {
    variants: {
      variant: {
        neutral: "border-border bg-secondary text-secondary-foreground",
        accent: "border-primary/15 bg-accent text-accent-foreground",
        success: "border-success/20 bg-success/10 text-success",
        warning: "border-warning/25 bg-warning/10 text-[oklch(0.5_0.13_60)]",
        danger: "border-destructive/20 bg-destructive/8 text-destructive",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
