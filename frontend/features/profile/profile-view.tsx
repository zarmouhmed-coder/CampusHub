"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { ErrorState, PageHeader } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, fieldA11y, FormError } from "@/components/ui/field";
import { Input, NativeSelect } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { applyApiError } from "@/lib/form-errors";
import type { Profile, ProfileUpdate } from "@/types/api";

import { useProfile, useUpdateProfile } from "./api";

const optional = (max: number) => z.string().trim().max(max, `${max} caractères maximum.`);

const profileSchema = z.object({
  first_name: z.string().trim().min(1, "Saisis ton prénom.").max(100, "100 caractères maximum."),
  promotion: optional(50),
  academic_year: z.string(),
  speciality: optional(100),
  td_group: optional(50),
  tp_group: optional(50),
});
type ProfileFormValues = z.infer<typeof profileSchema>;

const YEARS = [
  { value: "1", label: "1re année" },
  { value: "2", label: "2e année" },
  { value: "3", label: "3e année" },
  { value: "4", label: "4e année" },
  { value: "5", label: "5e année" },
];

function toFormValues(p?: Profile): ProfileFormValues {
  return {
    first_name: p?.first_name ?? "",
    promotion: p?.promotion ?? "",
    academic_year: p?.academic_year ? String(p.academic_year) : "",
    speciality: p?.speciality ?? "",
    td_group: p?.td_group ?? "",
    tp_group: p?.tp_group ?? "",
  };
}

function toUpdate(v: ProfileFormValues): ProfileUpdate {
  return {
    first_name: v.first_name,
    promotion: v.promotion || null,
    academic_year: v.academic_year ? Number(v.academic_year) : null,
    speciality: v.speciality || null,
    td_group: v.td_group || null,
    tp_group: v.tp_group || null,
  };
}

export function ProfileView() {
  const profile = useProfile();
  const update = useUpdateProfile();
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: toFormValues(),
  });
  const { errors, isSubmitting, isDirty } = form.formState;

  useEffect(() => {
    if (profile.data) form.reset(toFormValues(profile.data));
  }, [profile.data, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const saved = await update.mutateAsync(toUpdate(values));
      form.reset(toFormValues(saved));
      toast.success("Profil enregistré");
    } catch (error) {
      applyApiError(error, form.setError, [
        "first_name",
        "promotion",
        "academic_year",
        "speciality",
        "td_group",
        "tp_group",
      ]);
    }
  });

  const text = (name: Exclude<keyof ProfileFormValues, "academic_year">) => ({
    ...fieldA11y(`profile-${name}`, errors[name]?.message),
    ...form.register(name),
  });

  return (
    <>
      <PageHeader
        title="Profil"
        description="Ces informations t'aident à t'y retrouver ; seul le prénom est obligatoire."
      />

      {profile.isError ? (
        <ErrorState error={profile.error} onRetry={() => profile.refetch()} />
      ) : (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Informations étudiant</CardTitle>
          </CardHeader>
          <CardContent>
            {profile.isPending ? (
              <div className="grid gap-4" aria-busy="true">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : (
              <form onSubmit={onSubmit} noValidate className="grid gap-4">
                <FormError message={errors.root?.server?.message} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="profile-first_name" label="Prénom" error={errors.first_name?.message}>
                    <Input autoComplete="given-name" {...text("first_name")} />
                  </Field>
                  <Field
                    id="profile-email"
                    label="Adresse e-mail"
                    hint="Identifiant de connexion, non modifiable."
                  >
                    <Input id="profile-email" value={profile.data.email} readOnly disabled />
                  </Field>
                  <Field
                    id="profile-promotion"
                    label="Promotion"
                    optional
                    error={errors.promotion?.message}
                  >
                    <Input placeholder="Ex. 2027" {...text("promotion")} />
                  </Field>
                  <Field id="profile-academic_year" label="Année d'études" optional>
                    <NativeSelect id="profile-academic_year" {...form.register("academic_year")}>
                      <option value="">Non renseignée</option>
                      {YEARS.map((y) => (
                        <option key={y.value} value={y.value}>
                          {y.label}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                  <Field
                    id="profile-speciality"
                    label="Spécialité / approfondissement"
                    optional
                    error={errors.speciality?.message}
                    className="sm:col-span-2"
                  >
                    <Input placeholder="Ex. IAMD, LE, SIE, ISS…" {...text("speciality")} />
                  </Field>
                  <Field
                    id="profile-td_group"
                    label="Groupe de TD"
                    optional
                    error={errors.td_group?.message}
                  >
                    <Input placeholder="Ex. TD2" {...text("td_group")} />
                  </Field>
                  <Field
                    id="profile-tp_group"
                    label="Groupe de TP"
                    optional
                    error={errors.tp_group?.message}
                  >
                    <Input placeholder="Ex. TP2B" {...text("tp_group")} />
                  </Field>
                </div>
                <div className="mt-2 flex justify-end gap-2">
                  {isDirty && (
                    <Button variant="ghost" onClick={() => form.reset(toFormValues(profile.data))}>
                      Annuler
                    </Button>
                  )}
                  <Button type="submit" disabled={isSubmitting || !isDirty}>
                    {isSubmitting ? "Enregistrement…" : "Enregistrer"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
