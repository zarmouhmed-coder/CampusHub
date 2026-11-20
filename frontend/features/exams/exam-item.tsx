"use client";

import { MapPin, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SubjectLabel } from "@/features/subjects/subject-dot";
import { dayAndMonth, formatRelative, formatTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { Exam } from "@/types/api";

export function ExamItem({
  exam,
  onEdit,
  onDelete,
}: {
  exam: Exam;
  onEdit?: (exam: Exam) => void;
  onDelete?: (exam: Exam) => void;
}) {
  const { day, month } = dayAndMonth(exam.exam_at);
  const past = new Date(exam.exam_at) < new Date();

  return (
    <li
      className={cn(
        "bg-card flex items-center gap-3 rounded-lg border p-3 sm:px-4",
        past && "opacity-75",
      )}
    >
      <div
        className="bg-secondary/50 flex w-12 shrink-0 flex-col items-center rounded-md border py-1.5"
        style={
          exam.subject?.color
            ? { borderTopColor: exam.subject.color, borderTopWidth: 3 }
            : undefined
        }
      >
        <span className="text-lg leading-none font-semibold tabular-nums">{day}</span>
        <span className="text-muted-foreground mt-0.5 text-[0.7rem] uppercase">{month}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.925rem] font-medium">{exam.title}</p>
        <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <SubjectLabel subject={exam.subject} />
          <time dateTime={exam.exam_at}>
            {formatTime(exam.exam_at)} · {formatRelative(exam.exam_at)}
          </time>
          {exam.room && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" /> {exam.room}
            </span>
          )}
        </div>
      </div>
      {(onEdit || onDelete) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Actions pour ${exam.title}`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEdit && (
              <DropdownMenuItem onSelect={() => onEdit(exam)}>
                <Pencil /> Modifier
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem variant="destructive" onSelect={() => onDelete(exam)}>
                <Trash2 /> Supprimer
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  );
}
