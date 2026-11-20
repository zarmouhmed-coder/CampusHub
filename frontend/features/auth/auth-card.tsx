import Link from "next/link";

import { Logo } from "@/components/layout/logo";

export function AuthCard({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  footer: { text: string; linkLabel: string; href: string };
  children: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-md">
      <div className="mb-8 flex justify-center">
        <Logo />
      </div>
      <div className="bg-card shadow-card rounded-3xl p-6 sm:p-8">
        <div className="mb-6 space-y-1.5">
          <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
          <p className="text-muted-foreground text-sm">{subtitle}</p>
        </div>
        {children}
      </div>
      <p className="text-muted-foreground mt-6 text-center text-sm">
        {footer.text}{" "}
        <Link href={footer.href} className="text-primary font-semibold hover:underline">
          {footer.linkLabel}
        </Link>
      </p>
    </div>
  );
}
