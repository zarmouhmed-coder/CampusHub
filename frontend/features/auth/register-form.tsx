"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Field, fieldA11y, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { applyApiError } from "@/lib/form-errors";

import { useRegister } from "./api";
import { registerSchema, type RegisterValues } from "./schemas";

export function RegisterForm() {
  const register = useRegister();
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { first_name: "", email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await register.mutateAsync(values);
    } catch (error) {
      // 409 "e-mail already used" belongs next to the e-mail field.
      if (error instanceof Error && "status" in error && error.status === 409) {
        form.setError("email", { message: error.message });
      } else {
        applyApiError(error, form.setError, ["first_name", "email", "password"]);
      }
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormError message={errors.root?.server?.message} />
      <Field id="first_name" label="Prénom" error={errors.first_name?.message}>
        <Input
          autoComplete="given-name"
          {...fieldA11y("first_name", errors.first_name?.message)}
          {...form.register("first_name")}
        />
      </Field>
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
      <Field
        id="password"
        label="Mot de passe"
        hint="8 caractères minimum."
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
        className="mt-2 w-full"
        size="lg"
        disabled={isSubmitting || register.isSuccess}
      >
        {isSubmitting || register.isSuccess ? "Création du compte…" : "Créer mon compte"}
      </Button>
    </form>
  );
}
