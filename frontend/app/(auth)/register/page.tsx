import type { Metadata } from "next";

import { AuthCard } from "@/features/auth/auth-card";
import { RegisterForm } from "@/features/auth/register-form";

export const metadata: Metadata = { title: "Inscription" };

export default function RegisterPage() {
  return (
    <AuthCard
      title="Crée ton compte"
      subtitle="Devoirs, TP, projets et examens : tout au même endroit."
      footer={{ text: "Déjà inscrit ?", linkLabel: "Se connecter", href: "/login" }}
    >
      <RegisterForm />
    </AuthCard>
  );
}
