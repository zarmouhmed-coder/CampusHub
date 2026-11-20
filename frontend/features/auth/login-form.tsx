"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSyncExternalStore } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Field, fieldA11y, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { applyApiError } from "@/lib/form-errors";

import { useLogin } from "./api";
import { loginSchema, type LoginValues } from "./schemas";

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
  const sessionExpired = useSessionExpiredFlag();
  const login = useLogin();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await login.mutateAsync(values);
    } catch (error) {
      applyApiError(error, form.setError, ["email", "password"]);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      {sessionExpired && !errors.root && (
        <p className="bg-accent text-accent-foreground rounded-md px-3 py-2 text-sm">
          Ta session a expiré. Reconnecte-toi pour continuer.
        </p>
      )}
      <FormError message={errors.root?.server?.message} />
      <Field id="email" label="Adresse e-mail" error={errors.email?.message}>
        <Input
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="prenom.nom@telecomnancy.eu"
          {...fieldA11y("email", errors.email?.message)}
          {...form.register("email")}
        />
      </Field>
      <Field id="password" label="Mot de passe" error={errors.password?.message}>
        <Input
          type="password"
          autoComplete="current-password"
          {...fieldA11y("password", errors.password?.message)}
          {...form.register("password")}
        />
      </Field>
      <Button
        type="submit"
        className="mt-2 w-full"
        size="lg"
        disabled={isSubmitting || login.isSuccess}
      >
        {isSubmitting || login.isSuccess ? "Connexion…" : "Se connecter"}
      </Button>
    </form>
  );
}
