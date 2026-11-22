import type { Metadata } from "next";

import { RegisterView } from "@/features/auth/login-view";

export const metadata: Metadata = { title: "Inscription · Sign up" };

export default function RegisterPage() {
  return <RegisterView />;
}
