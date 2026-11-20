"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { useEffect } from "react";
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
import { ApiError } from "@/lib/api-client";
import { applyApiError } from "@/lib/form-errors";
import { cn } from "@/lib/utils";
import type { Subject } from "@/types/api";

import { useCreateSubject, useUpdateSubject } from "./api";
import {
  SUBJECT_COLORS,
  subjectSchema,
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
  const create = useCreateSubject();
  const update = useUpdateSubject();
  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
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
        toast.success("Matière mise à jour");
      } else {
        await create.mutateAsync(input);
        toast.success("Matière créée");
      }
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        form.setError("name", { message: error.message });
      } else {
        applyApiError(error, form.setError, ["name", "description", "color"]);
      }
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{subject ? "Modifier la matière" : "Nouvelle matière"}</DialogTitle>
          <DialogDescription>
            Les matières servent à classer tes devoirs et tes examens.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormError message={errors.root?.server?.message} />
          <Field id="subject-name" label="Nom" error={errors.name?.message}>
            <Input
              placeholder="Ex. Réseaux, Probabilités, Java…"
              autoFocus
              {...fieldA11y("subject-name", errors.name?.message)}
              {...form.register("name")}
            />
          </Field>
          <Field
            id="subject-description"
            label="Description"
            optional
            error={errors.description?.message}
          >
            <Textarea
              rows={3}
              placeholder="Enseignant, modalités d'évaluation…"
              {...fieldA11y("subject-description", errors.description?.message)}
              {...form.register("description")}
            />
          </Field>
          <fieldset className="grid grid-cols-1 gap-2">
            <legend className="mb-2 text-sm font-medium">Couleur</legend>
            <div className="flex flex-wrap gap-2">
              {SUBJECT_COLORS.map(({ value, label }) => (
                <label key={value} className="relative">
                  <input
                    type="radio"
                    value={value}
                    className="peer sr-only"
                    aria-label={label}
                    {...form.register("color")}
                  />
                  <span
                    className="ring-offset-popover peer-focus-visible:ring-primary grid size-8 place-items-center rounded-full ring-offset-2 transition-shadow peer-focus-visible:ring-2"
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
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Enregistrement…" : subject ? "Enregistrer" : "Créer la matière"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
