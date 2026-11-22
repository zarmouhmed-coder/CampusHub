"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useSyncExternalStore } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Field, fieldA11y, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { applyApiError } from "@/lib/form-errors";
import { useI18n } from "@/lib/i18n";

import { useLogin } from "./api";
import { makeLoginSchema, type LoginValues } from "./schemas";

/**
 * "?expired=1" is read on the client only. Reading searchParams on the server would
 * need a <Suspense> boundary that swaps the form once resolved, losing what was typed.
 */
function useSessionExpiredFlag() {
  return useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get("expired") === "1",
    () => false,
  );
}

export function LoginForm() {
  const { t } = useI18n();
  const sessionExpired = useSessionExpiredFlag();
  const login = useLogin();
  const schema = useMemo(() => makeLoginSchema(t), [t]);
  const form = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await login.mutateAsync(values);
    } catch (error) {
      applyApiError(error, form.setError, ["email", "password"], t);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      {sessionExpired && !errors.root && (
        <p className="border-primary/20 bg-accent text-accent-foreground rounded-lg border px-3.5 py-2.5 text-sm">
          {t.auth.sessionExpired}
        </p>
      )}
      <FormError message={errors.root?.server?.message} />
      <Field id="email" label={t.auth.email} error={errors.email?.message}>
        <Input
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder={t.auth.emailPlaceholder}
          {...fieldA11y("email", errors.email?.message)}
          {...form.register("email")}
        />
      </Field>
      <Field id="password" label={t.auth.password} error={errors.password?.message}>
        <Input
          type="password"
          autoComplete="current-password"
          {...fieldA11y("password", errors.password?.message)}
          {...form.register("password")}
        />
      </Field>
      <Button
        type="submit"
        size="lg"
        className="mt-2 w-full"
        disabled={isSubmitting || login.isSuccess}
      >
        {isSubmitting || login.isSuccess ? t.auth.loggingIn : t.auth.loginSubmit}
      </Button>
    </form>
  );
}
