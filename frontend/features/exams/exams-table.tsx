"use client";

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
import type { Exam } from "@/types/api";

import { ExamActions, ExamDateTile } from "./exam-item";

export function ExamsTable({
  items,
  onEdit,
  onDelete,
}: {
  items: Exam[];
  onEdit: (exam: Exam) => void;
  onDelete: (exam: Exam) => void;
}) {
  const { t } = useI18n();
  const fmt = useFormat();
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-16">{t.exams.table.date}</TableHead>
          <TableHead>{t.exams.table.title}</TableHead>
          <TableHead>{t.exams.table.subject}</TableHead>
          <TableHead>{t.exams.table.time}</TableHead>
          <TableHead>{t.exams.table.room}</TableHead>
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((exam) => (
          <TableRow key={exam.id} data-muted={new Date(exam.exam_at) < new Date()}>
            <TableCell>
              <ExamDateTile exam={exam} className="size-10" />
            </TableCell>
            <TableCell className="max-w-[22rem]">
              <p className="truncate font-medium">{exam.title}</p>
              {exam.description && (
                <p className="text-muted-foreground truncate text-xs">{exam.description}</p>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground max-w-[12rem]">
              <SubjectLabel subject={exam.subject} />
            </TableCell>
            <TableCell className="whitespace-nowrap">
              {fmt.time(exam.exam_at)}
              <p className="text-muted-foreground text-xs">{fmt.relative(exam.exam_at)}</p>
            </TableCell>
            <TableCell className="text-muted-foreground">{exam.room ?? "—"}</TableCell>
            <TableCell className="text-right">
              <ExamActions exam={exam} onEdit={onEdit} onDelete={onDelete} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
