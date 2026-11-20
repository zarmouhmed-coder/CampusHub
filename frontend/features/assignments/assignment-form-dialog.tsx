"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, fieldA11y, FormError } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { SubjectSelect } from "@/features/subjects/subject-select";
import { applyApiError } from "@/lib/form-errors";
import type { Assignment } from "@/types/api";

import { useCreateAssignment, useUpdateAssignment } from "./api";
import { PRIORITY_LABELS, STATUS_LABELS } from "./labels";
import {
  assignmentSchema,
  toAssignmentFormValues,
  toAssignmentInput,
  type AssignmentFormValues,
} from "./schemas";

const FIELDS = ["title", "description", "subject_id", "due_at", "priority", "status"] as const;

export function AssignmentFormDialog({
  open,
  onOpenChange,
  assignment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment?: Assignment;
}) {
  const create = useCreateAssignment();
  const update = useUpdateAssignment();
  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: toAssignmentFormValues(assignment),
  });
  const { errors, isSubmitting } = form.formState;

  useEffect(() => {
    if (open) form.reset(toAssignmentFormValues(assignment));
  }, [open, assignment, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const input = toAssignmentInput(values);
      if (assignment) {
        await update.mutateAsync({ id: assignment.id, input });
        toast.success("Devoir mis à jour");
      } else {
        await create.mutateAsync(input);
        toast.success("Devoir ajouté");
      }
      onOpenChange(false);
    } catch (error) {
      applyApiError(error, form.setError, FIELDS);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{assignment ? "Modifier le devoir" : "Nouveau devoir"}</DialogTitle>
          <DialogDescription>Devoir, TP ou projet à rendre.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormError message={errors.root?.server?.message} />
          <Field id="assignment-title" label="Titre" error={errors.title?.message}>
            <Input
              placeholder="Ex. TP3 : sockets TCP"
              autoFocus
              {...fieldA11y("assignment-title", errors.title?.message)}
              {...form.register("title")}
            />
          </Field>
          <div className="grid items-start gap-4 sm:grid-cols-2">
            <Field
              id="assignment-due"
              label="Date limite"
              hint="Heure de Paris"
              error={errors.due_at?.message}
            >
              <Input
                type="datetime-local"
                {...fieldA11y("assignment-due", errors.due_at?.message)}
                {...form.register("due_at")}
              />
            </Field>
            <Field id="assignment-subject" label="Matière" error={errors.subject_id?.message}>
              <SubjectSelect
                {...fieldA11y("assignment-subject", errors.subject_id?.message)}
                {...form.register("subject_id")}
              />
            </Field>
            <Field id="assignment-priority" label="Priorité" error={errors.priority?.message}>
              <NativeSelect id="assignment-priority" {...form.register("priority")}>
                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id="assignment-status" label="Statut" error={errors.status?.message}>
              <NativeSelect id="assignment-status" {...form.register("status")}>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <Field
            id="assignment-description"
            label="Description"
            optional
            error={errors.description?.message}
          >
            <Textarea
              rows={3}
              placeholder="Consignes, lien vers le sujet, modalités de rendu…"
              {...fieldA11y("assignment-description", errors.description?.message)}
              {...form.register("description")}
            />
          </Field>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Enregistrement…" : assignment ? "Enregistrer" : "Ajouter le devoir"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
