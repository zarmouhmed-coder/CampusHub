"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
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
import { useI18n } from "@/lib/i18n";
import { useFormat } from "@/lib/use-format";
import type { Exam } from "@/types/api";

import { useCreateExam, useUpdateExam } from "./api";
import { makeExamSchema, toExamFormValues, toExamInput, type ExamFormValues } from "./schemas";

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
  const { t } = useI18n();
  const fmt = useFormat();
  const create = useCreateExam();
  const update = useUpdateExam();
  const schema = useMemo(() => makeExamSchema(t), [t]);
  const form = useForm<ExamFormValues>({
    resolver: zodResolver(schema),
    defaultValues: toExamFormValues(fmt, exam),
  });
  const { errors, isSubmitting } = form.formState;

  useEffect(() => {
    if (open) form.reset(toExamFormValues(fmt, exam));
  }, [open, exam, form, fmt]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const input = toExamInput(fmt, values);
      if (exam) {
        await update.mutateAsync({ id: exam.id, input });
        toast.success(t.exams.updated);
      } else {
        await create.mutateAsync(input);
        toast.success(t.exams.created);
      }
      onOpenChange(false);
    } catch (error) {
      applyApiError(error, form.setError, FIELDS, t, { subject_not_found: "subject_id" });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{exam ? t.exams.edit : t.exams.new}</DialogTitle>
          <DialogDescription>{t.exams.dialogDescription}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormError message={errors.root?.server?.message} />
          <Field id="exam-title" label={t.exams.titleLabel} error={errors.title?.message}>
            <Input
              placeholder={t.exams.titlePlaceholder}
              autoFocus
              {...fieldA11y("exam-title", errors.title?.message)}
              {...form.register("title")}
            />
          </Field>
          <div className="grid items-start gap-4 sm:grid-cols-2">
            <Field
              id="exam-at"
              label={t.exams.date}
              hint={t.assignments.dueHint(fmt.timeZone)}
              error={errors.exam_at?.message}
            >
              <Input
                type="datetime-local"
                {...fieldA11y("exam-at", errors.exam_at?.message)}
                {...form.register("exam_at")}
              />
            </Field>
            <Field id="exam-subject" label={t.exams.subject} error={errors.subject_id?.message}>
              <SubjectSelect
                {...fieldA11y("exam-subject", errors.subject_id?.message)}
                {...form.register("subject_id")}
              />
            </Field>
          </div>
          <Field id="exam-room" label={t.exams.room} optional error={errors.room?.message}>
            <Input
              placeholder={t.exams.roomPlaceholder}
              {...fieldA11y("exam-room", errors.room?.message)}
              {...form.register("room")}
            />
          </Field>
          <Field
            id="exam-description"
            label={t.exams.descriptionLabel}
            optional
            error={errors.description?.message}
          >
            <Textarea
              rows={3}
              placeholder={t.exams.descriptionPlaceholder}
              {...fieldA11y("exam-description", errors.description?.message)}
              {...form.register("description")}
            />
          </Field>
          <DialogFooter className="mt-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t.common.saving : exam ? t.common.save : t.exams.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
