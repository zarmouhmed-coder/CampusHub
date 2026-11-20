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
import { dayAndMonth, formatRelative, formatTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { Exam } from "@/types/api";

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
  const { day, month } = dayAndMonth(exam.exam_at);
  const past = new Date(exam.exam_at) < new Date();

  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-2xl py-2.5 transition-colors",
        surface === "card"
          ? "bg-card shadow-card px-3 sm:px-4"
          : "hover:bg-secondary/70 -mx-2 px-2",
        past && "opacity-70",
      )}
    >
      <SubjectTile color={exam.subject?.color} className="flex-col gap-0 leading-none">
        <span className="text-base font-extrabold tabular-nums">{day}</span>
        <span className="mt-0.5 text-[0.6rem] font-bold uppercase">{month.replace(".", "")}</span>
      </SubjectTile>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.94rem] font-semibold">{exam.title}</p>
        <p className="text-muted-foreground mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs">
          <time dateTime={exam.exam_at} className="shrink-0">
            {formatTime(exam.exam_at)} · {formatRelative(exam.exam_at)}
          </time>
          <span aria-hidden>·</span>
          <span className="truncate">{exam.subject?.name ?? "Sans matière"}</span>
          {exam.room && (
            <span className="inline-flex shrink-0 items-center gap-1">
              <MapPin className="size-3" /> {exam.room}
            </span>
          )}
        </p>
      </div>
      {(onEdit || onDelete) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions pour ${exam.title}`}
              className="text-muted-foreground"
            >
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
