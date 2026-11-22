"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Field, fieldA11y, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { applyApiError } from "@/lib/form-errors";
import { useI18n } from "@/lib/i18n";

import { useRegister } from "./api";
import { makeRegisterSchema, type RegisterValues } from "./schemas";

export function RegisterForm() {
  const { t, locale } = useI18n();
  const register = useRegister();
  const schema = useMemo(() => makeRegisterSchema(t), [t]);
  const form = useForm<RegisterValues>({
    resolver: zodResolver(schema),
    defaultValues: { first_name: "", email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await register.mutateAsync({ ...values, locale });
    } catch (error) {
      applyApiError(error, form.setError, ["first_name", "email", "password"], t, {
        email_taken: "email",
      });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormError message={errors.root?.server?.message} />
      <Field id="first_name" label={t.auth.firstName} error={errors.first_name?.message}>
        <Input
          autoComplete="given-name"
          {...fieldA11y("first_name", errors.first_name?.message)}
          {...form.register("first_name")}
        />
      </Field>
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
      <Field
        id="password"
        label={t.auth.password}
        hint={t.auth.passwordHint}
        error={errors.password?.message}
      >
        <Input
          type="password"
          autoComplete="new-password"
          {...fieldA11y("password", errors.password?.message)}
          {...form.register("password")}
        />
      </Field>
      <Button
        type="submit"
        size="lg"
        className="mt-2 w-full"
        disabled={isSubmitting || register.isSuccess}
      >
        {isSubmitting || register.isSuccess ? t.auth.registering : t.auth.registerSubmit}
      </Button>
    </form>
  );
}
