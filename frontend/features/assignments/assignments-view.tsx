"use client";

import { ArrowDownWideNarrow, ArrowUpNarrowWide, ClipboardList, Plus } from "lucide-react";
import { useState } from "react";

import { Pagination } from "@/components/pagination";
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from "@/components/states";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { SubjectSelect } from "@/features/subjects/subject-select";
import { useI18n } from "@/lib/i18n";
import type { AssignmentStatus, Priority } from "@/types/api";

import { useAssignments, type AssignmentFilters } from "./api";
import { AssignmentItem } from "./assignment-item";
import { AssignmentsTable } from "./assignments-table";
import { PRIORITIES } from "./labels";
import { useAssignmentDialogs } from "./use-assignment-dialogs";

const PAGE_SIZE = 20;

export function AssignmentsView() {
  const { t } = useI18n();
  const [filters, setFilters] = useState<AssignmentFilters>({
    order: "asc",
    limit: PAGE_SIZE,
    offset: 0,
  });
  const assignments = useAssignments(filters);
  const { openCreate, openEdit, askDelete, dialogs } = useAssignmentDialogs();

  /** Any filter change goes back to the first page. */
  const update = (patch: Partial<AssignmentFilters>) =>
    setFilters((f) => ({ ...f, offset: 0, ...patch }));
  const hasFilters = Boolean(filters.status || filters.priority || filters.subject_id);
  const statusOptions = [
    { value: "all", label: t.assignments.all },
    { value: "todo", label: t.status.todo },
    { value: "in_progress", label: t.status.in_progress },
    { value: "done", label: t.assignments.doneFilter },
  ] as const;

  return (
    <>
      <PageHeader
        title={t.assignments.title}
        description={t.assignments.description}
        meta={assignments.data ? t.assignments.count(assignments.data.total) : undefined}
        actions={
          <Button onClick={openCreate}>
            <Plus /> {t.assignments.new}
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          label={t.assignments.filterStatus}
          value={filters.status ?? "all"}
          onChange={(v) => update({ status: v === "all" ? undefined : (v as AssignmentStatus) })}
          options={statusOptions}
        />
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <NativeSelect
            aria-label={t.assignments.filterPriority}
            value={filters.priority ?? ""}
            onChange={(e) => update({ priority: (e.target.value || undefined) as Priority })}
            className="sm:w-44"
          >
            <option value="">{t.assignments.allPriorities}</option>
            {PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {t.assignments.priorityOption(t.priority[value])}
              </option>
            ))}
          </NativeSelect>
          <SubjectSelect
            aria-label={t.subjects.filterLabel}
            emptyLabel={t.subjects.filterAll}
            value={filters.subject_id ?? ""}
            onChange={(e) => update({ subject_id: e.target.value || undefined })}
            className="sm:w-48"
          />
          <Button
            variant="secondary"
            className="col-span-2 h-10 sm:col-span-1"
            onClick={() => update({ order: filters.order === "asc" ? "desc" : "asc" })}
            aria-label={filters.order === "asc" ? t.assignments.sortAsc : t.assignments.sortDesc}
          >
            {filters.order === "asc" ? <ArrowUpNarrowWide /> : <ArrowDownWideNarrow />}
            {t.assignments.sortDue}
          </Button>
        </div>
      </div>

      {assignments.isPending ? (
        <ListSkeleton rows={6} />
      ) : assignments.isError ? (
        <ErrorState error={assignments.error} onRetry={() => assignments.refetch()} />
      ) : assignments.data.items.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={ClipboardList}
            title={t.assignments.emptyFiltered}
            action={
              <Button
                variant="secondary"
                onClick={() =>
                  update({ status: undefined, priority: undefined, subject_id: undefined })
                }
              >
                {t.common.resetFilters}
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={ClipboardList}
            title={t.assignments.emptyTitle}
            description={t.assignments.emptyText}
            action={
              <Button onClick={openCreate}>
                <Plus /> {t.assignments.addFirst}
              </Button>
            }
          />
        )
      ) : (
        <div
          className="transition-opacity data-[stale=true]:opacity-60"
          data-stale={assignments.isPlaceholderData}
        >
          <div className="hidden md:block">
            <AssignmentsTable
              items={assignments.data.items}
              onEdit={openEdit}
              onDelete={askDelete}
            />
          </div>
          <ul className="grid grid-cols-1 gap-2 md:hidden">
            {assignments.data.items.map((a) => (
              <AssignmentItem key={a.id} assignment={a} onEdit={openEdit} onDelete={askDelete} />
            ))}
          </ul>
          <Pagination
            total={assignments.data.total}
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
