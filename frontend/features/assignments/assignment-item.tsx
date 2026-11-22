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
import { useI18n } from "@/lib/i18n";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";
import type { Assignment, AssignmentStatus } from "@/types/api";

import { useUpdateAssignment } from "./api";
import { PRIORITY_BADGE, STATUS_BADGE, STATUSES } from "./labels";

const STATUS_ICONS = { todo: CircleDashed, in_progress: Clock, done: Check } as const;

export function useSetAssignmentStatus() {
  const { t } = useI18n();
  const update = useUpdateAssignment();
  return {
    pending: update.isPending,
    setStatus: (assignment: Assignment, status: AssignmentStatus) =>
      update.mutate(
        { id: assignment.id, input: { status } },
        {
          onSuccess: () =>
            toast.success(
              status === "done" ? t.status.congrats : t.status.changed(t.status[status]),
            ),
          onError: (error) => toast.error(errorMessage(error, t)),
        },
      ),
  };
}

export const isOverdue = (a: Assignment) => a.status !== "done" && new Date(a.due_at) < new Date();

/** Round check button: empty (to do), amber ring (in progress), green (done). */
export function StatusCheck({ assignment }: { assignment: Assignment }) {
  const { t } = useI18n();
  const { setStatus, pending } = useSetAssignmentStatus();
  const done = assignment.status === "done";
  return (
    <button
      type="button"
      onClick={() => setStatus(assignment, done ? "todo" : "done")}
      disabled={pending}
      aria-label={done ? t.status.markTodo(assignment.title) : t.status.markDone(assignment.title)}
      aria-pressed={done}
      className={cn(
        "focus-visible:ring-ring grid size-5 shrink-0 place-items-center rounded-full border-2 transition-all focus-visible:ring-[3px] focus-visible:outline-none active:scale-90",
        done
          ? "border-success bg-success text-white"
          : assignment.status === "in_progress"
            ? "border-warning hover:bg-warning/10"
            : "border-input hover:border-success",
      )}
    >
      {done && <Check className="size-3" strokeWidth={3.5} />}
    </button>
  );
}

export function AssignmentActions({
  assignment,
  onEdit,
  onDelete,
}: {
  assignment: Assignment;
  onEdit?: (assignment: Assignment) => void;
  onDelete?: (assignment: Assignment) => void;
}) {
  const { t } = useI18n();
  const { setStatus } = useSetAssignmentStatus();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t.common.actionsFor(assignment.title)}
          className="text-muted-foreground"
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>{t.status.change}</DropdownMenuLabel>
        {STATUSES.map((status) => {
          const Icon = STATUS_ICONS[status];
          return (
            <DropdownMenuItem
              key={status}
              disabled={status === assignment.status}
              onSelect={() => setStatus(assignment, status)}
            >
              <Icon /> {t.status[status]}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        {onEdit && (
          <DropdownMenuItem onSelect={() => onEdit(assignment)}>
            <Pencil /> {t.common.edit}
          </DropdownMenuItem>
        )}
        {onDelete && (
          <DropdownMenuItem variant="destructive" onSelect={() => onDelete(assignment)}>
            <Trash2 /> {t.common.delete}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** One assignment as a row (mobile lists, dashboard). Desktop pages use a table instead. */
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
  /** "card": standalone raised card. "plain": row inside an existing card. */
  surface?: "card" | "plain";
}) {
  const { t } = useI18n();
  const fmt = useFormat();
  const done = assignment.status === "done";
  const overdue = isOverdue(assignment);

  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-xl py-2 transition-colors",
        surface === "card" ? "soft px-3" : "hover:bg-surface -mx-2 px-2",
      )}
    >
      <StatusCheck assignment={assignment} />
      <SubjectTile color={assignment.subject?.color} icon={ClipboardList} className="size-9" />

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm font-semibold",
            done && "text-muted-foreground line-through decoration-2",
          )}
        >
          {assignment.title}
        </p>
        <p className="text-muted-foreground mt-0.5 flex min-w-0 items-center gap-1.5 text-xs">
          <time
            dateTime={assignment.due_at}
            title={fmt.dateTime(assignment.due_at)}
            className={cn("shrink-0", overdue && "text-destructive font-semibold")}
          >
            {overdue ? `${t.assignments.overdue} · ` : ""}
            {compact ? fmt.relative(assignment.due_at) : fmt.dateTime(assignment.due_at)}
          </time>
          <span aria-hidden>·</span>
          <span className="truncate">{assignment.subject?.name ?? t.common.noSubject}</span>
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {assignment.priority === "high" && !done && (
          <Flag
            className="fill-destructive/15 text-destructive size-4 sm:hidden"
            aria-label={t.priority.highAria}
          />
        )}
        {(assignment.priority === "high" || !compact) && (
          <Badge variant={PRIORITY_BADGE[assignment.priority]} className="hidden sm:inline-flex">
            {t.priority[assignment.priority]}
          </Badge>
        )}
        {!compact && (
          <Badge variant={STATUS_BADGE[assignment.status]} className="hidden sm:inline-flex">
            {t.status[assignment.status]}
          </Badge>
        )}
        {(onEdit || onDelete) && (
          <AssignmentActions assignment={assignment} onEdit={onEdit} onDelete={onDelete} />
        )}
      </div>
    </li>
  );
}
