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
import type { Subject } from "@/types/api";

import { useDeleteSubject, useSubjects } from "./api";
import { SubjectTile } from "./subject-dot";
import { SubjectFormDialog } from "./subject-form-dialog";

export function SubjectsView() {
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
        title="Matières"
        description="Organise tes devoirs et examens par matière."
        actions={
          <Button onClick={openCreate}>
            <Plus /> Nouvelle matière
          </Button>
        }
      />

      {subjects.isPending ? (
        <ListSkeleton rows={3} className="sm:grid-cols-2 lg:grid-cols-3" />
      ) : subjects.isError ? (
        <ErrorState error={subjects.error} onRetry={() => subjects.refetch()} />
      ) : subjects.data.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Commence par ajouter ta première matière"
          description="Réseaux, Probabilités, Java… Tu pourras ensuite y rattacher tes devoirs et tes examens."
          action={
            <Button onClick={openCreate}>
              <Plus /> Ajouter une matière
            </Button>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.data.map((subject) => (
            <li key={subject.id} className="bg-card shadow-card flex rounded-3xl p-4 sm:p-5">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <SubjectTile color={subject.color} icon={BookOpen} />
                <div className="min-w-0 flex-1 pt-0.5">
                  <h2 className="truncate font-bold">{subject.name}</h2>
                  <p className="text-muted-foreground mt-0.5 line-clamp-2 text-sm">
                    {subject.description || "Pas de description"}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Actions pour ${subject.name}`}
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
                      <Pencil /> Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(subject)}>
                      <Trash2 /> Supprimer
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
        title={`Supprimer « ${deleting?.name ?? ""} » ?`}
        description="Les devoirs et examens liés à cette matière sont conservés : ils seront simplement sans matière."
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.mutateAsync(deleting.id);
            toast.success("Matière supprimée");
          } catch (error) {
            toast.error(errorMessage(error));
            throw error;
          }
        }}
      />
    </>
  );
}
