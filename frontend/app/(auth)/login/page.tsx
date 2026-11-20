import type { Metadata } from "next";

import { AuthCard } from "@/features/auth/auth-card";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <AuthCard
      title="Bon retour parmi nous"
      subtitle="Connecte-toi pour retrouver tes échéances."
      footer={{ text: "Pas encore de compte ?", linkLabel: "Créer un compte", href: "/register" }}
    >
      <LoginForm />
    </AuthCard>
  );
}
