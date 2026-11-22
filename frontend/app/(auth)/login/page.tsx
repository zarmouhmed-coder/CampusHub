import type { Metadata } from "next";

import { LoginView } from "@/features/auth/login-view";

export const metadata: Metadata = { title: "Connexion · Sign in" };

export default function LoginPage() {
  return <LoginView />;
}
