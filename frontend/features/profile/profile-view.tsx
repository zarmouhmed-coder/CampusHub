"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { useChangeLocale } from "@/components/layout/user-menu";
import { ErrorState, PageHeader } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, fieldA11y, FormError } from "@/components/ui/field";
import { Input, NativeSelect } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/api-client";
import { applyApiError } from "@/lib/form-errors";
import { LOCALES, useI18n, type Locale } from "@/lib/i18n";
import type { Messages } from "@/lib/i18n/fr";
import { useTheme, type ThemeChoice } from "@/lib/theme";
import type { Profile, ProfileUpdate } from "@/types/api";

import { useProfile, useUpdateProfile } from "./api";

const makeProfileSchema = (t: Messages) => {
  const optional = (max: number) => z.string().trim().max(max, t.validation.max(max));
  return z.object({
    first_name: z
      .string()
      .trim()
      .min(1, t.validation.firstNameRequired)
      .max(100, t.validation.max(100)),
    promotion: optional(50),
    academic_year: z.string(),
    speciality: optional(100),
    td_group: optional(50),
    tp_group: optional(50),
  });
};
type ProfileFormValues = z.infer<ReturnType<typeof makeProfileSchema>>;
type TextField = Exclude<keyof ProfileFormValues, "academic_year">;

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

/** All IANA timezones known to the browser, African ones first (main target market). */
function timeZones(current: string): string[] {
  let zones: string[] = [];
  try {
    zones = Intl.supportedValuesOf("timeZone");
  } catch {
    zones = [];
  }
  if (!zones.includes(current)) zones = [current, ...zones];
  const africa = zones.filter((z) => z.startsWith("Africa/"));
  return [...africa, ...zones.filter((z) => !z.startsWith("Africa/"))];
}

function PreferencesCard({ profile }: { profile: Profile }) {
  const { t, locale } = useI18n();
  const { theme, setTheme } = useTheme();
  const update = useUpdateProfile();
  const changeLocale = useChangeLocale();
  const zones = useMemo(() => timeZones(profile.timezone), [profile.timezone]);

  const themeOptions = [
    { value: "light", label: t.shell.themeLight },
    { value: "dark", label: t.shell.themeDark },
    { value: "system", label: t.shell.themeSystem },
  ] as const;
  const ThemeIcon = { light: Sun, dark: Moon, system: Monitor }[theme];

  return (
    <Card>
      <CardHeader className="block">
        <CardTitle>{t.profile.preferences}</CardTitle>
        <p className="text-muted-foreground mt-1 text-sm">{t.profile.preferencesText}</p>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Field id="pref-language" label={t.profile.language}>
          <NativeSelect
            id="pref-language"
            value={locale}
            onChange={(e) => changeLocale(e.target.value as Locale)}
          >
            {LOCALES.map((l) => (
              <option key={l} value={l}>
                {t.languages[l]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="pref-timezone" label={t.profile.timezone} hint={t.profile.timezoneHint}>
          <NativeSelect
            id="pref-timezone"
            value={profile.timezone}
            disabled={update.isPending}
            onChange={(e) =>
              update.mutate(
                { timezone: e.target.value },
                {
                  onSuccess: () => toast.success(t.profile.preferencesSaved),
                  onError: (error) => toast.error(errorMessage(error, t)),
                },
              )
            }
          >
            {zones.map((zone) => (
              <option key={zone} value={zone}>
                {zone.replaceAll("_", " ")}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <div className="grid gap-1.5">
          <span className="flex items-center gap-2 text-sm font-medium">
            <ThemeIcon className="text-muted-foreground size-4" /> {t.shell.theme}
          </span>
          <Segmented
            label={t.shell.theme}
            value={theme}
            onChange={(value: ThemeChoice) => setTheme(value)}
            options={themeOptions}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function ProfileView() {
  const { t } = useI18n();
  const profile = useProfile();
  const update = useUpdateProfile();
  const schema = useMemo(() => makeProfileSchema(t), [t]);
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(),
  });
  const { errors, isSubmitting, isDirty } = form.formState;

  useEffect(() => {
    if (profile.data && !form.formState.isDirty) form.reset(toFormValues(profile.data));
  }, [profile.data, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const saved = await update.mutateAsync(toUpdate(values));
      form.reset(toFormValues(saved));
      toast.success(t.profile.saved);
    } catch (error) {
      applyApiError(
        error,
        form.setError,
        ["first_name", "promotion", "academic_year", "speciality", "td_group", "tp_group"],
        t,
      );
    }
  });

  const text = (name: TextField) => ({
    ...fieldA11y(`profile-${name}`, errors[name]?.message),
    ...form.register(name),
  });

  return (
    <>
      <PageHeader title={t.profile.title} description={t.profile.description} />

      {profile.isError ? (
        <ErrorState error={profile.error} onRetry={() => profile.refetch()} />
      ) : profile.isPending ? (
        <div className="grid gap-5 lg:grid-cols-3" aria-busy="true">
          <Skeleton className="h-96 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t.profile.studentInfo}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} noValidate className="grid gap-4">
                <FormError message={errors.root?.server?.message} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    id="profile-first_name"
                    label={t.profile.firstName}
                    error={errors.first_name?.message}
                  >
                    <Input autoComplete="given-name" {...text("first_name")} />
                  </Field>
                  <Field id="profile-email" label={t.profile.email} hint={t.profile.emailHint}>
                    <Input id="profile-email" value={profile.data.email} readOnly disabled />
                  </Field>
                  <Field
                    id="profile-promotion"
                    label={t.profile.promotion}
                    optional
                    error={errors.promotion?.message}
                  >
                    <Input placeholder={t.profile.promotionPlaceholder} {...text("promotion")} />
                  </Field>
                  <Field id="profile-academic_year" label={t.profile.year} optional>
                    <NativeSelect id="profile-academic_year" {...form.register("academic_year")}>
                      <option value="">{t.profile.yearNone}</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <option key={n} value={n}>
                          {t.profile.yearOption(n)}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                  <Field
                    id="profile-speciality"
                    label={t.profile.speciality}
                    optional
                    error={errors.speciality?.message}
                    className="sm:col-span-2"
                  >
                    <Input placeholder={t.profile.specialityPlaceholder} {...text("speciality")} />
                  </Field>
                  <Field
                    id="profile-td_group"
                    label={t.profile.tdGroup}
                    optional
                    error={errors.td_group?.message}
                  >
                    <Input placeholder={t.profile.tdPlaceholder} {...text("td_group")} />
                  </Field>
                  <Field
                    id="profile-tp_group"
                    label={t.profile.tpGroup}
                    optional
                    error={errors.tp_group?.message}
                  >
                    <Input placeholder={t.profile.tpPlaceholder} {...text("tp_group")} />
                  </Field>
                </div>
                <div className="mt-2 flex justify-end gap-2">
                  {isDirty && (
                    <Button variant="ghost" onClick={() => form.reset(toFormValues(profile.data))}>
                      {t.common.cancel}
                    </Button>
                  )}
                  <Button type="submit" disabled={isSubmitting || !isDirty}>
                    {isSubmitting ? t.common.saving : t.common.save}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
          <PreferencesCard profile={profile.data} />
        </div>
      )}
    </>
  );
}
