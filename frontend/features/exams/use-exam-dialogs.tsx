"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { errorMessage } from "@/lib/api-client";
import type { Exam } from "@/types/api";

import { useDeleteExam } from "./api";
import { ExamFormDialog } from "./exam-form-dialog";

export function useExamDialogs() {
  const remove = useDeleteExam();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Exam | undefined>();
  const [deleting, setDeleting] = useState<Exam | null>(null);

  const dialogs = (
    <>
      <ExamFormDialog open={formOpen} onOpenChange={setFormOpen} exam={editing} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Supprimer cet examen ?"
        description={`« ${deleting?.title ?? ""} » sera définitivement supprimé.`}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.mutateAsync(deleting.id);
            toast.success("Examen supprimé");
          } catch (error) {
            toast.error(errorMessage(error));
            throw error;
          }
        }}
      />
    </>
  );

  return {
    openCreate: () => {
      setEditing(undefined);
      setFormOpen(true);
    },
    openEdit: (exam: Exam) => {
      setEditing(exam);
      setFormOpen(true);
    },
    askDelete: setDeleting,
    dialogs,
  };
}
