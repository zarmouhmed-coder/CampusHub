"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { Logo, LogoMark } from "@/components/layout/logo";
import { useI18n } from "@/lib/i18n";

import { LanguageSwitch } from "./language-switch";

/** Decorative pattern of arches and columns: an academic motif, purely visual. */
function ArchesPattern() {
  return (
    <svg aria-hidden className="absolute inset-0 h-full w-full opacity-[0.07]">
      <defs>
        <pattern id="arches" width="72" height="96" patternUnits="userSpaceOnUse">
          <path d="M8 96V44a28 28 0 0 1 56 0v52" fill="none" stroke="white" strokeWidth="1.2" />
          <path d="M20 96V48a16 16 0 0 1 32 0v48" fill="none" stroke="white" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#arches)" />
    </svg>
  );
}

function Hero() {
  const { t } = useI18n();
  return (
    <aside className="relative hidden overflow-hidden rounded-3xl bg-[linear-gradient(160deg,oklch(0.3_0.09_266),oklch(0.2_0.06_268))] p-10 text-white lg:flex lg:flex-col lg:justify-between">
      <ArchesPattern />
      <div
        aria-hidden
        className="absolute -right-24 -bottom-24 size-80 rounded-full bg-[oklch(0.72_0.12_80/0.18)] blur-3xl"
      />
      <div className="relative flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-xl bg-white/90 shadow-lg">
          <LogoMark className="size-9" />
        </span>
        <span className="font-display text-xl font-semibold">CampusHub</span>
      </div>
      <div className="relative max-w-md">
        <p className="mb-3 text-xs font-semibold tracking-[0.18em] text-[oklch(0.82_0.1_82)] uppercase">
          {t.auth.heroKicker}
        </p>
        <h2 className="font-display text-4xl leading-tight font-semibold">{t.auth.heroTitle}</h2>
        <p className="mt-4 text-[0.95rem] leading-relaxed text-white/70">{t.auth.heroText}</p>
        <ul className="mt-8 space-y-3">
          {t.auth.heroPoints.map((point) => (
            <li key={point} className="flex items-start gap-3 text-sm text-white/85">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[oklch(0.82_0.1_82)]" />
              {point}
            </li>
          ))}
        </ul>
      </div>
      <p className="relative text-xs text-white/45">© CampusHub</p>
    </aside>
  );
}

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
    <div className="grid min-h-dvh gap-6 p-3 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:p-4">
      <Hero />
      <div className="flex flex-col">
        <div className="flex items-center justify-between px-2 pt-2 lg:justify-end">
          <Logo className="lg:hidden" />
          <LanguageSwitch />
        </div>
        <div className="flex flex-1 items-center justify-center px-2 py-10">
          <div className="animate-rise w-full max-w-sm">
            <div className="mb-7">
              <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
              <p className="text-muted-foreground mt-2 text-sm">{subtitle}</p>
            </div>
            {children}
            <p className="text-muted-foreground mt-6 text-center text-sm">
              {footer.text}{" "}
              <Link href={footer.href} className="text-primary font-semibold hover:underline">
                {footer.linkLabel}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
