"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import { applyApiError } from "@/lib/form-errors";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Subject } from "@/types/api";

import { useCreateSubject, useUpdateSubject } from "./api";
import {
  makeSubjectSchema,
  SUBJECT_COLORS,
  toSubjectFormValues,
  toSubjectInput,
  type SubjectFormValues,
} from "./schemas";

export function SubjectFormDialog({
  open,
  onOpenChange,
  subject,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit mode when provided. */
  subject?: Subject;
}) {
  const { t } = useI18n();
  const create = useCreateSubject();
  const update = useUpdateSubject();
  const schema = useMemo(() => makeSubjectSchema(t), [t]);
  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(schema),
    defaultValues: toSubjectFormValues(subject),
  });
  const { errors, isSubmitting } = form.formState;
  const selectedColor = useWatch({ control: form.control, name: "color" });

  useEffect(() => {
    if (open) form.reset(toSubjectFormValues(subject));
  }, [open, subject, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const input = toSubjectInput(values);
      if (subject) {
        await update.mutateAsync({ id: subject.id, input });
        toast.success(t.subjects.updated);
      } else {
        await create.mutateAsync(input);
        toast.success(t.subjects.created);
      }
      onOpenChange(false);
    } catch (error) {
      applyApiError(error, form.setError, ["name", "description", "color"], t, {
        subject_name_taken: "name",
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{subject ? t.subjects.edit : t.subjects.new}</DialogTitle>
          <DialogDescription>{t.subjects.dialogDescription}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormError message={errors.root?.server?.message} />
          <Field id="subject-name" label={t.subjects.name} error={errors.name?.message}>
            <Input
              placeholder={t.subjects.namePlaceholder}
              autoFocus
              {...fieldA11y("subject-name", errors.name?.message)}
              {...form.register("name")}
            />
          </Field>
          <Field
            id="subject-description"
            label={t.subjects.descriptionLabel}
            optional
            error={errors.description?.message}
          >
            <Textarea
              rows={3}
              placeholder={t.subjects.descriptionPlaceholder}
              {...fieldA11y("subject-description", errors.description?.message)}
              {...form.register("description")}
            />
          </Field>
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">{t.subjects.color}</legend>
            <div className="flex flex-wrap gap-2">
              {SUBJECT_COLORS.map(({ value, key }) => (
                <label key={value} className="relative">
                  <input
                    type="radio"
                    value={value}
                    className="peer sr-only"
                    aria-label={t.subjects.colors[key]}
                    {...form.register("color")}
                  />
                  <span
                    className="ring-offset-popover peer-focus-visible:ring-primary grid size-8 place-items-center rounded-full shadow-[inset_0_1px_0_oklch(1_0_0/0.3)] ring-offset-2 transition-transform peer-focus-visible:ring-2 hover:scale-110"
                    style={{ backgroundColor: value }}
                  >
                    <Check
                      className={cn(
                        "size-4 text-white transition-opacity",
                        selectedColor === value ? "opacity-100" : "opacity-0",
                      )}
                      strokeWidth={3}
                    />
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <DialogFooter className="mt-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t.common.saving : subject ? t.common.save : t.subjects.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
