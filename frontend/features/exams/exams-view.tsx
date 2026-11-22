"use client";

import { GraduationCap, Plus } from "lucide-react";
import { useState } from "react";

import { Pagination } from "@/components/pagination";
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { SubjectSelect } from "@/features/subjects/subject-select";
import { useI18n } from "@/lib/i18n";

import { useExams, type ExamFilters } from "./api";
import { ExamItem } from "./exam-item";
import { ExamsTable } from "./exams-table";
import { useExamDialogs } from "./use-exam-dialogs";

const PAGE_SIZE = 20;

export function ExamsView() {
  const { t } = useI18n();
  const [filters, setFilters] = useState<ExamFilters>({
    when: "upcoming",
    limit: PAGE_SIZE,
    offset: 0,
  });
  const exams = useExams(filters);
  const { openCreate, openEdit, askDelete, dialogs } = useExamDialogs();
  const update = (patch: Partial<ExamFilters>) =>
    setFilters((f) => ({ ...f, offset: 0, ...patch }));
  const whenOptions = [
    { value: "upcoming", label: t.exams.upcoming },
    { value: "past", label: t.exams.past },
  ] as const;

  return (
    <>
      <PageHeader
        title={t.exams.title}
        description={t.exams.description}
        meta={exams.data ? t.exams.count(exams.data.total) : undefined}
        actions={
          <Button onClick={openCreate}>
            <Plus /> {t.exams.new}
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          label={t.exams.period}
          value={filters.when === "past" ? "past" : "upcoming"}
          onChange={(when) => update({ when })}
          options={whenOptions}
        />
        <SubjectSelect
          aria-label={t.subjects.filterLabel}
          emptyLabel={t.subjects.filterAll}
          value={filters.subject_id ?? ""}
          onChange={(e) => update({ subject_id: e.target.value || undefined })}
          className="sm:w-52"
        />
      </div>

      {exams.isPending ? (
        <ListSkeleton rows={5} />
      ) : exams.isError ? (
        <ErrorState error={exams.error} onRetry={() => exams.refetch()} />
      ) : exams.data.items.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title={
            filters.subject_id
              ? t.exams.emptySubject
              : filters.when === "past"
                ? t.exams.emptyPast
                : t.exams.emptyUpcoming
          }
          description={
            filters.when === "upcoming" && !filters.subject_id
              ? t.exams.emptyUpcomingText
              : undefined
          }
          action={
            filters.when === "upcoming" ? (
              <Button onClick={openCreate}>
                <Plus /> {t.exams.addFirst}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div
          className="transition-opacity data-[stale=true]:opacity-60"
          data-stale={exams.isPlaceholderData}
        >
          <div className="hidden md:block">
            <ExamsTable items={exams.data.items} onEdit={openEdit} onDelete={askDelete} />
          </div>
          <ul className="grid grid-cols-1 gap-2 md:hidden">
            {exams.data.items.map((exam) => (
              <ExamItem key={exam.id} exam={exam} onEdit={openEdit} onDelete={askDelete} />
            ))}
          </ul>
          <Pagination
            total={exams.data.total}
            limit={filters.limit}
            offset={filters.offset}
            onChange={(offset) => setFilters((f) => ({ ...f, offset }))}
          />
        </div>
      )}

      {dialogs}
    </>
  );
}
