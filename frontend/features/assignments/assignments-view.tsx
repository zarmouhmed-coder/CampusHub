"use client";

import { ArrowDownWideNarrow, ArrowUpNarrowWide, ClipboardList, Plus } from "lucide-react";
import { useState } from "react";

import { Pagination } from "@/components/pagination";
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from "@/components/states";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { SubjectSelect } from "@/features/subjects/subject-select";
import type { AssignmentStatus, Priority } from "@/types/api";

import { useAssignments, type AssignmentFilters } from "./api";
import { AssignmentItem } from "./assignment-item";
import { PRIORITY_LABELS } from "./labels";
import { useAssignmentDialogs } from "./use-assignment-dialogs";

const PAGE_SIZE = 20;
const STATUS_OPTIONS = [
  { value: "all", label: "Tous" },
  { value: "todo", label: "À faire" },
  { value: "in_progress", label: "En cours" },
  { value: "done", label: "Terminés" },
] as const;

export function AssignmentsView() {
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

  return (
    <>
      <PageHeader
        title="Devoirs"
        description="Devoirs, TP et projets, triés par échéance."
        actions={
          <Button onClick={openCreate}>
            <Plus /> Nouveau devoir
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          label="Filtrer par statut"
          value={filters.status ?? "all"}
          onChange={(v) => update({ status: v === "all" ? undefined : (v as AssignmentStatus) })}
          options={STATUS_OPTIONS}
          className="w-full overflow-x-auto sm:w-auto"
        />
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <NativeSelect
            aria-label="Filtrer par priorité"
            value={filters.priority ?? ""}
            onChange={(e) => update({ priority: (e.target.value || undefined) as Priority })}
            className="sm:w-40"
          >
            <option value="">Toutes priorités</option>
            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                Priorité {label.toLowerCase()}
              </option>
            ))}
          </NativeSelect>
          <SubjectSelect
            aria-label="Filtrer par matière"
            emptyLabel="Toutes matières"
            value={filters.subject_id ?? ""}
            onChange={(e) => update({ subject_id: e.target.value || undefined })}
            className="sm:w-44"
          />
          <Button
            variant="outline"
            className="col-span-2 sm:col-span-1"
            onClick={() => update({ order: filters.order === "asc" ? "desc" : "asc" })}
            aria-label={
              filters.order === "asc"
                ? "Tri : échéance la plus proche d'abord"
                : "Tri : échéance la plus lointaine d'abord"
            }
          >
            {filters.order === "asc" ? <ArrowUpNarrowWide /> : <ArrowDownWideNarrow />}
            Échéance
          </Button>
        </div>
      </div>

      {assignments.isPending ? (
        <ListSkeleton rows={5} />
      ) : assignments.isError ? (
        <ErrorState error={assignments.error} onRetry={() => assignments.refetch()} />
      ) : assignments.data.items.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={ClipboardList}
            title="Aucun devoir ne correspond à ces filtres"
            action={
              <Button
                variant="outline"
                onClick={() =>
                  update({ status: undefined, priority: undefined, subject_id: undefined })
                }
              >
                Réinitialiser les filtres
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="Aucun devoir pour l'instant"
            description="Ajoute tes devoirs, TP et projets pour ne plus rater une échéance."
            action={
              <Button onClick={openCreate}>
                <Plus /> Ajouter un devoir
              </Button>
            }
          />
        )
      ) : (
        <>
          <ul
            className="grid grid-cols-1 gap-2 transition-opacity data-[stale=true]:opacity-60"
            data-stale={assignments.isPlaceholderData}
          >
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
        </>
      )}

      {dialogs}
    </>
  );
}
