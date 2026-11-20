"use client";

import {
  Check,
  CircleDashed,
  ClipboardList,
  Clock,
  Flag,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
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
import { SubjectTile } from "@/features/subjects/subject-dot";
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

/** Round check button: empty (to do), amber ring (in progress), green (done). */
function StatusCheck({ assignment }: { assignment: Assignment }) {
  const { setStatus, pending } = useSetAssignmentStatus();
  const done = assignment.status === "done";
  return (
    <button
      type="button"
      onClick={() => setStatus(assignment, done ? "todo" : "done")}
      disabled={pending}
      aria-label={
        done ? `Marquer « ${assignment.title} » à faire` : `Marquer « ${assignment.title} » terminé`
      }
      aria-pressed={done}
      className={cn(
        "focus-visible:ring-ring grid size-6 shrink-0 place-items-center rounded-full border-2 transition-all focus-visible:ring-[3px] focus-visible:outline-none active:scale-90",
        done
          ? "border-success bg-success text-white"
          : assignment.status === "in_progress"
            ? "border-warning hover:bg-warning/10"
            : "border-border hover:border-success",
      )}
    >
      {done && <Check className="size-3.5" strokeWidth={3.5} />}
    </button>
  );
}

export function AssignmentItem({
  assignment,
  onEdit,
  onDelete,
  compact = false,
  surface = "card",
}: {
  assignment: Assignment;
  onEdit?: (assignment: Assignment) => void;
  onDelete?: (assignment: Assignment) => void;
  /** Relative dates ("demain à 23:59") and fewer badges. */
  compact?: boolean;
  /** "card": standalone white card. "plain": row inside an existing card. */
  surface?: "card" | "plain";
}) {
  const { setStatus } = useSetAssignmentStatus();
  const done = assignment.status === "done";
  const overdue = !done && new Date(assignment.due_at) < new Date();

  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-2xl py-2.5 transition-colors",
        surface === "card"
          ? "bg-card shadow-card px-3 sm:px-4"
          : "hover:bg-secondary/70 -mx-2 px-2",
      )}
    >
      <StatusCheck assignment={assignment} />
      <SubjectTile color={assignment.subject?.color} icon={ClipboardList} />

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-[0.94rem] font-semibold",
            done && "text-muted-foreground line-through decoration-2",
          )}
        >
          {assignment.title}
        </p>
        <p className="text-muted-foreground mt-0.5 flex min-w-0 items-center gap-1.5 text-xs">
          <time
            dateTime={assignment.due_at}
            title={formatDateTime(assignment.due_at)}
            className={cn("shrink-0", overdue && "text-destructive font-semibold")}
          >
            {overdue ? "En retard · " : ""}
            {compact ? formatRelative(assignment.due_at) : formatDateTime(assignment.due_at)}
          </time>
          <span aria-hidden>·</span>
          <span className="truncate">{assignment.subject?.name ?? "Sans matière"}</span>
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {assignment.priority === "high" && !done && (
          <Flag
            className="fill-destructive/15 text-destructive size-4 sm:hidden"
            aria-label="Priorité élevée"
          />
        )}
        {(assignment.priority === "high" || !compact) && (
          <Badge variant={PRIORITY_BADGE[assignment.priority]} className="hidden sm:inline-flex">
            {PRIORITY_LABELS[assignment.priority]}
          </Badge>
        )}
        {!compact && (
          <Badge variant={STATUS_BADGE[assignment.status]} className="hidden sm:inline-flex">
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
                className="text-muted-foreground"
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
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
