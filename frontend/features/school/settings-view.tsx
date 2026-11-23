"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { RequireRole } from "@/components/campus/guard";
import { PageHeader } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, fieldA11y, FormError } from "@/components/ui/field";
import { Input, NativeSelect } from "@/components/ui/input";
import { applyApiError } from "@/lib/form-errors";
import { useI18n } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import { api, useApiMutation } from "@/lib/use-api";
import type { Institution } from "@/types/api";

type Values = {
  name: string;
  logo_url: string;
  primary_color: string;
  grade_max: string;
  pass_mark: string;
  compensation: boolean;
  locale: "fr" | "en";
  timezone: string;
  currency: string;
};

function Settings({ institution }: { institution: Institution }) {
  const { t } = useI18n();
  const st = t.campus.settings;
  const queryClient = useQueryClient();
  const form = useForm<Values>({
    defaultValues: {
      name: institution.name,
      logo_url: institution.logo_url ?? "",
      primary_color: institution.primary_color ?? "#2747b8",
      grade_max: String(institution.grade_max),
      pass_mark: String(institution.pass_mark),
      compensation: institution.compensation,
      locale: institution.locale,
      timezone: institution.timezone,
      currency: institution.currency,
    },
  });
  const save = useApiMutation(
    (body: Record<string, unknown>) => api.patch<Institution>("/school/settings", body),
    {
      success: t.campus.common.saved,
    },
  );
  const { errors, isSubmitting, isDirty } = form.formState;
  const onSubmit = form.handleSubmit(async (v) => {
    try {
      await save.mutateAsync({
        name: v.name,
        logo_url: v.logo_url || null,
        primary_color: v.primary_color,
        grade_max: Number(v.grade_max),
        pass_mark: Number(v.pass_mark),
        compensation: v.compensation,
        locale: v.locale,
        timezone: v.timezone,
        currency: v.currency.toUpperCase(),
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.me });
      form.reset(v);
    } catch (error) {
      applyApiError(
        error,
        form.setError,
        ["name", "logo_url", "grade_max", "pass_mark", "timezone", "currency"],
        t,
      );
    }
  });
  const input = (
    name: keyof Values,
    label: string,
    props: React.ComponentProps<"input"> = {},
    hint?: string,
  ) => (
    <Field id={`set-${name}`} label={label} hint={hint} error={errors[name]?.message}>
      <Input
        {...fieldA11y(`set-${name}`, errors[name]?.message)}
        {...props}
        {...form.register(name)}
      />
    </Field>
  );

  return (
    <>
      <PageHeader title={st.title} description={st.subtitle} />
      <form onSubmit={onSubmit} noValidate className="grid items-start gap-5 lg:grid-cols-3">
        <div className="grid gap-5 lg:col-span-2">
          <FormError message={errors.root?.server?.message} />
          <Card>
            <CardHeader>
              <CardTitle>{st.identity}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">{input("name", t.campus.common.name)}</div>
              {input("logo_url", st.logoUrl, { type: "url", placeholder: "https://" })}
              {input("primary_color", st.primaryColor, { type: "color", className: "h-10 p-1" })}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{st.grading}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {input("grade_max", st.gradeMax, { type: "number", step: "1", min: 1 })}
              {input("pass_mark", st.passMark, { type: "number", step: "0.5", min: 0 })}
              <label className="flex items-start gap-3 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-[var(--primary)]"
                  {...form.register("compensation")}
                />
                <span>
                  <span className="font-medium">{st.compensation}</span>
                  <span className="text-muted-foreground block">{st.compensationHint}</span>
                </span>
              </label>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{st.regional}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <Field id="set-locale" label={t.campus.platform.locale}>
                <NativeSelect id="set-locale" {...form.register("locale")}>
                  <option value="fr">{t.languages.fr}</option>
                  <option value="en">{t.languages.en}</option>
                </NativeSelect>
              </Field>
              {input("timezone", t.campus.platform.timezone)}
              {input("currency", t.campus.platform.currency, { maxLength: 3 })}
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting || !isDirty}>
              {isSubmitting ? t.common.saving : t.common.save}
            </Button>
          </div>
        </div>
        <Card>
          <CardHeader className="block">
            <CardTitle>{st.subscription}</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">{st.subscriptionHint}</p>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Badge variant="accent">{t.campus.plans[institution.plan]}</Badge>
            <ul className="grid gap-1.5 text-sm">
              {institution.modules.map((m) => (
                <li key={m}>✓ {t.campus.modules[m]}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </form>
    </>
  );
}

export function SettingsView() {
  return (
    <RequireRole roles={["admin"]}>
      {({ institution }) => <Settings institution={institution} />}
    </RequireRole>
  );
}
