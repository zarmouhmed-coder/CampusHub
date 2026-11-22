"use client";

import { MapPin, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SubjectTile } from "@/features/subjects/subject-dot";
import { useI18n } from "@/lib/i18n";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";
import type { Exam } from "@/types/api";

export function ExamDateTile({ exam, className }: { exam: Exam; className?: string }) {
  const fmt = useFormat();
  const { day, month } = fmt.dayMonth(exam.exam_at);
  return (
    <SubjectTile
      color={exam.subject?.color}
      className={cn("flex-col gap-0 leading-none", className)}
    >
      <span className="text-[0.95rem] font-bold tabular-nums">{day}</span>
      <span className="mt-0.5 text-[0.58rem] font-bold uppercase">{month.replace(".", "")}</span>
    </SubjectTile>
  );
}

export function ExamActions({
  exam,
  onEdit,
  onDelete,
}: {
  exam: Exam;
  onEdit?: (exam: Exam) => void;
  onDelete?: (exam: Exam) => void;
}) {
  const { t } = useI18n();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t.common.actionsFor(exam.title)}
          className="text-muted-foreground"
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onEdit && (
          <DropdownMenuItem onSelect={() => onEdit(exam)}>
            <Pencil /> {t.common.edit}
          </DropdownMenuItem>
        )}
        {onDelete && (
          <DropdownMenuItem variant="destructive" onSelect={() => onDelete(exam)}>
            <Trash2 /> {t.common.delete}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ExamItem({
  exam,
  onEdit,
  onDelete,
  surface = "card",
}: {
  exam: Exam;
  onEdit?: (exam: Exam) => void;
  onDelete?: (exam: Exam) => void;
  surface?: "card" | "plain";
}) {
  const { t } = useI18n();
  const fmt = useFormat();
  const past = new Date(exam.exam_at) < new Date();

  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-xl py-2 transition-colors",
        surface === "card" ? "soft px-3" : "hover:bg-surface -mx-2 px-2",
        past && "opacity-70",
      )}
    >
      <ExamDateTile exam={exam} className="size-9" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{exam.title}</p>
        <p className="text-muted-foreground mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs">
          <time dateTime={exam.exam_at} className="shrink-0">
            {fmt.time(exam.exam_at)} · {fmt.relative(exam.exam_at)}
          </time>
          <span aria-hidden>·</span>
          <span className="truncate">{exam.subject?.name ?? t.common.noSubject}</span>
          {exam.room && (
            <span className="inline-flex shrink-0 items-center gap-1">
              <MapPin className="size-3" /> {exam.room}
            </span>
          )}
        </p>
      </div>
      {(onEdit || onDelete) && <ExamActions exam={exam} onEdit={onEdit} onDelete={onDelete} />}
    </li>
  );
}
