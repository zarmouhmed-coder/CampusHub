"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { errorMessage } from "@/lib/api-client";
import type { Assignment } from "@/types/api";

import { useDeleteAssignment } from "./api";
import { AssignmentFormDialog } from "./assignment-form-dialog";

/** Create / edit / delete dialogs for assignments, reusable on any page. */
export function useAssignmentDialogs() {
  const remove = useDeleteAssignment();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Assignment | undefined>();
  const [deleting, setDeleting] = useState<Assignment | null>(null);

  const dialogs = (
    <>
      <AssignmentFormDialog open={formOpen} onOpenChange={setFormOpen} assignment={editing} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Supprimer ce devoir ?"
        description={`« ${deleting?.title ?? ""} » sera définitivement supprimé.`}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.mutateAsync(deleting.id);
            toast.success("Devoir supprimé");
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
    openEdit: (assignment: Assignment) => {
      setEditing(assignment);
      setFormOpen(true);
    },
    askDelete: setDeleting,
    dialogs,
  };
}
