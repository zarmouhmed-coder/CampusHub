import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-[color,background-color,box-shadow,transform] duration-150 outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Subtle top highlight + coloured shadow: depth without a loud gradient.
        default:
          "bg-primary text-primary-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.18),0_6px_14px_-6px_var(--primary)] hover:brightness-110",
        ink: "bg-ink text-ink-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.12)] hover:opacity-90",
        secondary: "soft text-foreground hover:bg-surface",
        outline: "border border-border bg-transparent hover:bg-secondary/60",
        ghost: "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.15)] hover:brightness-110",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-3.5",
        sm: "h-8 gap-1.5 px-2.5 text-[0.8rem]",
        lg: "h-11 px-5 text-[0.95rem]",
        icon: "size-9",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  type = "button",
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      type={asChild ? undefined : type}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
