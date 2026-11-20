"use client";

import { Check, CircleDashed, Clock, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SubjectLabel } from "@/features/subjects/subject-dot";
import { errorMessage } from "@/lib/api-client";
import { formatDateTime, formatRelative } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { Assignment, AssignmentStatus } from "@/types/api";

import { useUpdateAssignment } from "./api";
import { PRIORITY_BADGE, PRIORITY_LABELS, STATUS_BADGE, STATUS_LABELS } from "./labels";

const STATUS_ICONS = { todo: CircleDashed, in_progress: Clock, done: Check } as const;

export function useSetAssignmentStatus() {
  const update = useUpdateAssignment();
  return {
    pending: update.isPending,
    setStatus: (assignment: Assignment, status: AssignmentStatus) =>
      update.mutate(
        { id: assignment.id, input: { status } },
        {
          onSuccess: () =>
            toast.success(
              status === "done" ? "Bravo, devoir terminé !" : `Statut : ${STATUS_LABELS[status]}`,
            ),
          onError: (error) => toast.error(errorMessage(error)),
        },
      ),
  };
}

export function AssignmentItem({
  assignment,
  onEdit,
  onDelete,
  compact = false,
}: {
  assignment: Assignment;
  onEdit?: (assignment: Assignment) => void;
  onDelete?: (assignment: Assignment) => void;
  compact?: boolean;
}) {
  const { setStatus, pending } = useSetAssignmentStatus();
  const done = assignment.status === "done";
  const overdue = !done && new Date(assignment.due_at) < new Date();

  return (
    <li
      className={cn(
        "bg-card flex items-start gap-3 rounded-lg border px-3 py-3 transition-colors sm:px-4",
        overdue && "border-destructive/25 bg-destructive/[0.02]",
      )}
    >
      <button
        type="button"
        onClick={() => setStatus(assignment, done ? "todo" : "done")}
        disabled={pending}
        aria-label={
          done
            ? `Marquer « ${assignment.title} » à faire`
            : `Marquer « ${assignment.title} » terminé`
        }
        aria-pressed={done}
        className={cn(
          "focus-visible:ring-ring mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors focus-visible:ring-[3px] focus-visible:outline-none",
          done
            ? "border-success bg-success text-white"
            : "border-muted-foreground/40 hover:border-primary",
        )}
      >
        {done && <Check className="size-3" strokeWidth={3.5} />}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-[0.925rem] font-medium",
            done && "text-muted-foreground line-through",
          )}
        >
          {assignment.title}
        </p>
        <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <SubjectLabel subject={assignment.subject} />
          <time
            dateTime={assignment.due_at}
            title={formatDateTime(assignment.due_at)}
            className={cn(overdue && "text-destructive font-medium")}
          >
            {overdue ? "En retard · " : ""}
            {compact ? formatRelative(assignment.due_at) : formatDateTime(assignment.due_at)}
          </time>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {assignment.priority === "high" || !compact ? (
          <Badge variant={PRIORITY_BADGE[assignment.priority]} className="hidden sm:inline-flex">
            {PRIORITY_LABELS[assignment.priority]}
          </Badge>
        ) : null}
        {!compact && (
          <Badge variant={STATUS_BADGE[assignment.status]}>
            {STATUS_LABELS[assignment.status]}
          </Badge>
        )}
        {(onEdit || onDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Actions pour ${assignment.title}`}
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Changer le statut</DropdownMenuLabel>
              {(Object.keys(STATUS_LABELS) as AssignmentStatus[]).map((status) => {
                const Icon = STATUS_ICONS[status];
                return (
                  <DropdownMenuItem
                    key={status}
                    disabled={status === assignment.status}
                    onSelect={() => setStatus(assignment, status)}
                  >
                    <Icon /> {STATUS_LABELS[status]}
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
              {onEdit && (
                <DropdownMenuItem onSelect={() => onEdit(assignment)}>
                  <Pencil /> Modifier
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem variant="destructive" onSelect={() => onDelete(assignment)}>
                  <Trash2 /> Supprimer
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </li>
  );
}
