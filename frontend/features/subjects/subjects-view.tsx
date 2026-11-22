"use client";

import { BookOpen, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, ErrorState, ListSkeleton, PageHeader } from "@/components/states";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { errorMessage } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n";
import type { Subject } from "@/types/api";

import { useDeleteSubject, useSubjects } from "./api";
import { SubjectTile } from "./subject-dot";
import { SubjectFormDialog } from "./subject-form-dialog";

export function SubjectsView() {
  const { t } = useI18n();
  const subjects = useSubjects();
  const remove = useDeleteSubject();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | undefined>();
  const [deleting, setDeleting] = useState<Subject | null>(null);

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  return (
    <>
      <PageHeader
        title={t.subjects.title}
        description={t.subjects.description}
        meta={subjects.data ? t.subjects.count(subjects.data.length) : undefined}
        actions={
          <Button onClick={openCreate}>
            <Plus /> {t.subjects.new}
          </Button>
        }
      />

      {subjects.isPending ? (
        <ListSkeleton rows={4} className="sm:grid-cols-2 xl:grid-cols-4" />
      ) : subjects.isError ? (
        <ErrorState error={subjects.error} onRetry={() => subjects.refetch()} />
      ) : subjects.data.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={t.subjects.emptyTitle}
          description={t.subjects.emptyText}
          action={
            <Button onClick={openCreate}>
              <Plus /> {t.subjects.addFirst}
            </Button>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {subjects.data.map((subject) => (
            <li
              key={subject.id}
              className="soft group hover:shadow-glass relative flex overflow-hidden rounded-2xl p-4 transition-shadow"
            >
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-1"
                style={{ backgroundColor: subject.color ?? "var(--border)" }}
              />
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <SubjectTile color={subject.color} icon={BookOpen} />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold">{subject.name}</h2>
                  <p className="text-muted-foreground mt-0.5 line-clamp-2 text-sm">
                    {subject.description || t.subjects.noDescription}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t.common.actionsFor(subject.name)}
                    >
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() => {
                        setEditing(subject);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil /> {t.common.edit}
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(subject)}>
                      <Trash2 /> {t.common.delete}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </li>
          ))}
        </ul>
      )}

      <SubjectFormDialog open={formOpen} onOpenChange={setFormOpen} subject={editing} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t.subjects.deleteTitle(deleting?.name ?? "")}
        description={t.subjects.deleteText}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.mutateAsync(deleting.id);
            toast.success(t.subjects.deleted);
          } catch (error) {
            toast.error(errorMessage(error, t));
            throw error;
          }
        }}
      />
    </>
  );
}
