import { ChevronDown } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

export const fieldBase =
  "w-full min-w-0 rounded-md border border-input bg-card px-3 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground/80 focus-visible:border-primary/60 focus-visible:ring-[3px] focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(fieldBase, "h-9 py-1", className)}
      {...props}
    />
  );
}

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(fieldBase, "min-h-20 resize-y py-2", className)}
      {...props}
    />
  );
}

/** Native <select>: robust with forms and the best UX on mobile. */
function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className={cn("relative", className)}>
      <select
        data-slot="native-select"
        className={cn(fieldBase, "h-9 appearance-none pr-9")}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2"
      />
    </div>
  );
}

export { Input, NativeSelect, Textarea };
