import { cn } from "@/lib/utils";
import type { SubjectSummary } from "@/types/api";

export function SubjectDot({ color, className }: { color: string | null; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "bg-muted-foreground/40 inline-block size-2.5 shrink-0 rounded-full",
        className,
      )}
      style={color ? { backgroundColor: color } : undefined}
    />
  );
}

export function SubjectLabel({ subject }: { subject: SubjectSummary | null }) {
  if (!subject) return <span className="text-muted-foreground">Sans matière</span>;
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <SubjectDot color={subject.color} />
      <span className="truncate">{subject.name}</span>
    </span>
  );
}
