import { GraduationCap } from "lucide-react";

import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="bg-ink text-ink-foreground grid size-9 place-items-center rounded-xl">
        <GraduationCap className="size-5" strokeWidth={2.25} />
      </span>
      <span className="text-lg font-extrabold tracking-tight">CampusHub</span>
    </div>
  );
}
