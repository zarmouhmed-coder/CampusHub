import type * as React from "react";

import { cn } from "@/lib/utils";

/** Flat data table: sticky header, compact rows, hover highlight. */
function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="flat overflow-x-auto rounded-2xl">
      <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      className={cn("bg-surface/95 sticky top-0 z-10 backdrop-blur [&_tr]:border-b", className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      className={cn(
        "hover:bg-surface/70 border-b transition-colors data-[muted=true]:opacity-70",
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "text-muted-foreground h-10 px-3 text-left align-middle text-xs font-semibold tracking-wide whitespace-nowrap uppercase first:pl-4 last:pr-4",
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return <td className={cn("h-13 px-3 align-middle first:pl-4 last:pr-4", className)} {...props} />;
}

export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow };
