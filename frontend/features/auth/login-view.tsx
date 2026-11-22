"use client";

import { useI18n } from "@/lib/i18n";

import { AuthCard } from "./auth-card";
import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form";

export function LoginView() {
  const { t } = useI18n();
  return (
    <AuthCard
      title={t.auth.loginTitle}
      subtitle={t.auth.loginSubtitle}
      footer={{ text: t.auth.noAccount, linkLabel: t.auth.createAccount, href: "/register" }}
    >
      <LoginForm />
    </AuthCard>
  );
}

export function RegisterView() {
  const { t } = useI18n();
  return (
    <AuthCard
      title={t.auth.registerTitle}
      subtitle={t.auth.registerSubtitle}
      footer={{ text: t.auth.alreadyRegistered, linkLabel: t.auth.signIn, href: "/login" }}
    >
      <RegisterForm />
    </AuthCard>
  );
}
