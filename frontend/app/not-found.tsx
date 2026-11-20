import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Page introuvable</h1>
        <p className="text-muted-foreground mt-1">Cette page n&apos;existe pas ou plus.</p>
      </div>
      <Button asChild>
        <Link href="/dashboard">Retour au tableau de bord</Link>
      </Button>
    </main>
  );
}
