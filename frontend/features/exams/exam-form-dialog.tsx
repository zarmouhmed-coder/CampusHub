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
import { Input, Textarea } from "@/components/ui/input";
import { SubjectSelect } from "@/features/subjects/subject-select";
import { applyApiError } from "@/lib/form-errors";
import type { Exam } from "@/types/api";

import { useCreateExam, useUpdateExam } from "./api";
import { examSchema, toExamFormValues, toExamInput, type ExamFormValues } from "./schemas";

const FIELDS = ["title", "subject_id", "exam_at", "room", "description"] as const;

export function ExamFormDialog({
  open,
  onOpenChange,
  exam,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exam?: Exam;
}) {
  const create = useCreateExam();
  const update = useUpdateExam();
  const form = useForm<ExamFormValues>({
    resolver: zodResolver(examSchema),
    defaultValues: toExamFormValues(exam),
  });
  const { errors, isSubmitting } = form.formState;

  useEffect(() => {
    if (open) form.reset(toExamFormValues(exam));
  }, [open, exam, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const input = toExamInput(values);
      if (exam) {
        await update.mutateAsync({ id: exam.id, input });
        toast.success("Examen mis à jour");
      } else {
        await create.mutateAsync(input);
        toast.success("Examen ajouté");
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
          <DialogTitle>{exam ? "Modifier l'examen" : "Nouvel examen"}</DialogTitle>
          <DialogDescription>Partiel, contrôle continu, oral…</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormError message={errors.root?.server?.message} />
          <Field id="exam-title" label="Titre" error={errors.title?.message}>
            <Input
              placeholder="Ex. Partiel de probabilités"
              autoFocus
              {...fieldA11y("exam-title", errors.title?.message)}
              {...form.register("title")}
            />
          </Field>
          <div className="grid items-start gap-4 sm:grid-cols-2">
            <Field
              id="exam-at"
              label="Date et heure"
              hint="Heure de Paris"
              error={errors.exam_at?.message}
            >
              <Input
                type="datetime-local"
                {...fieldA11y("exam-at", errors.exam_at?.message)}
                {...form.register("exam_at")}
              />
            </Field>
            <Field id="exam-subject" label="Matière" error={errors.subject_id?.message}>
              <SubjectSelect
                {...fieldA11y("exam-subject", errors.subject_id?.message)}
                {...form.register("subject_id")}
              />
            </Field>
          </div>
          <Field id="exam-room" label="Salle" optional error={errors.room?.message}>
            <Input
              placeholder="Ex. Amphi Nord"
              {...fieldA11y("exam-room", errors.room?.message)}
              {...form.register("room")}
            />
          </Field>
          <Field
            id="exam-description"
            label="Description"
            optional
            error={errors.description?.message}
          >
            <Textarea
              rows={3}
              placeholder="Chapitres à réviser, documents autorisés…"
              {...fieldA11y("exam-description", errors.description?.message)}
              {...form.register("description")}
            />
          </Field>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Enregistrement…" : exam ? "Enregistrer" : "Ajouter l'examen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
