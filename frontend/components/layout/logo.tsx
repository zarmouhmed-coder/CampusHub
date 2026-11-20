import { GraduationCap } from "lucide-react";

import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-lg shadow-xs">
        <GraduationCap className="size-[1.1rem]" strokeWidth={2.25} />
      </span>
      <span className="text-[1.05rem] font-semibold tracking-tight">CampusHub</span>
    </div>
  );
}
