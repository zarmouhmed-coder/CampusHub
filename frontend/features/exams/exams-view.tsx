"use client";

import { GraduationCap, Plus } from "lucide-react";
import { useState } from "react";

import { Pagination } from "@/components/pagination";
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { SubjectSelect } from "@/features/subjects/subject-select";

import { useExams, type ExamFilters } from "./api";
import { ExamItem } from "./exam-item";
import { useExamDialogs } from "./use-exam-dialogs";

const PAGE_SIZE = 20;
const WHEN_OPTIONS = [
  { value: "upcoming", label: "À venir" },
  { value: "past", label: "Passés" },
] as const;

export function ExamsView() {
  const [filters, setFilters] = useState<ExamFilters>({
    when: "upcoming",
    limit: PAGE_SIZE,
    offset: 0,
  });
  const exams = useExams(filters);
  const { openCreate, openEdit, askDelete, dialogs } = useExamDialogs();
  const update = (patch: Partial<ExamFilters>) =>
    setFilters((f) => ({ ...f, offset: 0, ...patch }));

  return (
    <>
      <PageHeader
        title="Examens"
        description="Partiels, contrôles et oraux, dans l'ordre chronologique."
        actions={
          <Button onClick={openCreate}>
            <Plus /> Nouvel examen
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          label="Période"
          value={filters.when === "past" ? "past" : "upcoming"}
          onChange={(when) => update({ when })}
          options={WHEN_OPTIONS}
          className="w-full sm:w-auto"
        />
        <SubjectSelect
          aria-label="Filtrer par matière"
          emptyLabel="Toutes matières"
          value={filters.subject_id ?? ""}
          onChange={(e) => update({ subject_id: e.target.value || undefined })}
          className="sm:w-48"
        />
      </div>

      {exams.isPending ? (
        <ListSkeleton rows={4} />
      ) : exams.isError ? (
        <ErrorState error={exams.error} onRetry={() => exams.refetch()} />
      ) : exams.data.items.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title={
            filters.subject_id
              ? "Aucun examen pour cette matière"
              : filters.when === "past"
                ? "Aucun examen passé"
                : "Aucun examen enregistré"
          }
          description={
            filters.when === "upcoming" && !filters.subject_id
              ? "Ajoute tes partiels pour les voir apparaître sur ton tableau de bord."
              : undefined
          }
          action={
            filters.when === "upcoming" ? (
              <Button onClick={openCreate}>
                <Plus /> Ajouter un examen
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <ul
            className="grid grid-cols-1 gap-2 transition-opacity data-[stale=true]:opacity-60"
            data-stale={exams.isPlaceholderData}
          >
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
        </>
      )}

      {dialogs}
    </>
  );
}
