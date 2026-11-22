"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SubjectLabel } from "@/features/subjects/subject-dot";
import { useI18n } from "@/lib/i18n";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";
import type { Assignment } from "@/types/api";

import { AssignmentActions, isOverdue, StatusCheck } from "./assignment-item";
import { PRIORITY_BADGE, STATUS_BADGE } from "./labels";

/** Dense desktop view of assignments. */
export function AssignmentsTable({
  items,
  onEdit,
  onDelete,
}: {
  items: Assignment[];
  onEdit: (assignment: Assignment) => void;
  onDelete: (assignment: Assignment) => void;
}) {
  const { t } = useI18n();
  const fmt = useFormat();
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-10" />
          <TableHead>{t.assignments.table.title}</TableHead>
          <TableHead>{t.assignments.table.subject}</TableHead>
          <TableHead>{t.assignments.table.due}</TableHead>
          <TableHead>{t.assignments.table.priority}</TableHead>
          <TableHead>{t.assignments.table.status}</TableHead>
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((a) => {
          const overdue = isOverdue(a);
          const done = a.status === "done";
          return (
            <TableRow key={a.id} data-muted={done}>
              <TableCell>
                <StatusCheck assignment={a} />
              </TableCell>
              <TableCell className="max-w-[22rem]">
                <p className={cn("truncate font-medium", done && "line-through decoration-2")}>
                  {a.title}
                </p>
                {a.description && (
                  <p className="text-muted-foreground truncate text-xs">{a.description}</p>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground max-w-[12rem]">
                <SubjectLabel subject={a.subject} />
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <time
                  dateTime={a.due_at}
                  className={cn(overdue && "text-destructive font-semibold")}
                >
                  {fmt.dateTime(a.due_at)}
                </time>
                <p
                  className={cn("text-muted-foreground text-xs", overdue && "text-destructive/80")}
                >
                  {overdue ? t.assignments.overdue : fmt.relative(a.due_at)}
                </p>
              </TableCell>
              <TableCell>
                <Badge variant={PRIORITY_BADGE[a.priority]}>{t.priority[a.priority]}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_BADGE[a.status]}>{t.status[a.status]}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <AssignmentActions assignment={a} onEdit={onEdit} onDelete={onDelete} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
