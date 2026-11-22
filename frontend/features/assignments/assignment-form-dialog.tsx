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
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { SubjectSelect } from "@/features/subjects/subject-select";
import { applyApiError } from "@/lib/form-errors";
import { useI18n } from "@/lib/i18n";
import { useFormat } from "@/lib/use-format";
import type { Assignment } from "@/types/api";

import { useCreateAssignment, useUpdateAssignment } from "./api";
import { PRIORITIES, STATUSES } from "./labels";
import {
  makeAssignmentSchema,
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
  const { t } = useI18n();
  const fmt = useFormat();
  const create = useCreateAssignment();
  const update = useUpdateAssignment();
  const schema = useMemo(() => makeAssignmentSchema(t), [t]);
  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: toAssignmentFormValues(fmt, assignment),
  });
  const { errors, isSubmitting } = form.formState;

  useEffect(() => {
    if (open) form.reset(toAssignmentFormValues(fmt, assignment));
  }, [open, assignment, form, fmt]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const input = toAssignmentInput(fmt, values);
      if (assignment) {
        await update.mutateAsync({ id: assignment.id, input });
        toast.success(t.assignments.updated);
      } else {
        await create.mutateAsync(input);
        toast.success(t.assignments.created);
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
          <DialogTitle>{assignment ? t.assignments.edit : t.assignments.new}</DialogTitle>
          <DialogDescription>{t.assignments.dialogDescription}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormError message={errors.root?.server?.message} />
          <Field
            id="assignment-title"
            label={t.assignments.titleLabel}
            error={errors.title?.message}
          >
            <Input
              placeholder={t.assignments.titlePlaceholder}
              autoFocus
              {...fieldA11y("assignment-title", errors.title?.message)}
              {...form.register("title")}
            />
          </Field>
          <div className="grid items-start gap-4 sm:grid-cols-2">
            <Field
              id="assignment-due"
              label={t.assignments.due}
              hint={t.assignments.dueHint(fmt.timeZone)}
              error={errors.due_at?.message}
            >
              <Input
                type="datetime-local"
                {...fieldA11y("assignment-due", errors.due_at?.message)}
                {...form.register("due_at")}
              />
            </Field>
            <Field
              id="assignment-subject"
              label={t.assignments.subject}
              error={errors.subject_id?.message}
            >
              <SubjectSelect
                {...fieldA11y("assignment-subject", errors.subject_id?.message)}
                {...form.register("subject_id")}
              />
            </Field>
            <Field id="assignment-priority" label={t.priority.label}>
              <NativeSelect id="assignment-priority" {...form.register("priority")}>
                {PRIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {t.priority[value]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id="assignment-status" label={t.assignments.status}>
              <NativeSelect id="assignment-status" {...form.register("status")}>
                {STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {t.status[value]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <Field
            id="assignment-description"
            label={t.assignments.descriptionLabel}
            optional
            error={errors.description?.message}
          >
            <Textarea
              rows={3}
              placeholder={t.assignments.descriptionPlaceholder}
              {...fieldA11y("assignment-description", errors.description?.message)}
              {...form.register("description")}
            />
          </Field>
          <DialogFooter className="mt-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t.common.saving : assignment ? t.common.save : t.assignments.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
