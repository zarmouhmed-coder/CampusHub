"use client";

import { CheckCircle2, SearchX, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { homeFor } from "@/components/layout/navigation";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Field, fieldA11y, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthCard } from "@/features/auth/auth-card";
import { LanguageSwitch } from "@/features/auth/language-switch";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "@/lib/api-client";
import { formatNumber } from "@/lib/format";
import { applyApiError } from "@/lib/form-errors";
import { useI18n } from "@/lib/i18n";
import { queryKeys } from "@/lib/query-keys";
import { useApi } from "@/lib/use-api";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";
import type { User, Verification } from "@/types/api";

/* ---------- Document verification (no account needed) ---------- */

function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-6">
      <div className="mb-10 flex items-center justify-between">
        <Link href="/verify">
          <Logo />
        </Link>
        <LanguageSwitch />
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function VerifyForm({ initial = "" }: { initial?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [code, setCode] = useState(initial);
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (code.trim()) router.push(`/verify/${encodeURIComponent(code.trim().toUpperCase())}`);
      }}
    >
      <Input
        aria-label={t.campus.verify.codeLabel}
        placeholder="XXXX-XXXX-XXXX"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="font-mono uppercase"
      />
      <Button type="submit">{t.campus.verify.check}</Button>
    </form>
  );
}

export function VerifyHome() {
  const { t } = useI18n();
  return (
    <PublicShell>
      <h1 className="font-display text-3xl font-semibold">{t.campus.verify.title}</h1>
      <p className="text-muted-foreground mt-2 mb-6">{t.campus.verify.text}</p>
      <VerifyForm />
    </PublicShell>
  );
}

export function VerifyResult({ code }: { code: string }) {
  const { t } = useI18n();
  const v = t.campus.verify;
  const fmt = useFormat();
  const result = useApi<Verification>(`/verify/${encodeURIComponent(code)}`);
  const notFound = result.error instanceof ApiError && result.error.status === 404;
  const data = result.data;
  const tone = !data ? "neutral" : data.valid ? "ok" : "bad";

  return (
    <PublicShell>
      <h1 className="font-display mb-6 text-3xl font-semibold">{v.title}</h1>
      {result.isPending ? (
        <Skeleton className="h-48 rounded-2xl" />
      ) : notFound || !data ? (
        <div className="soft rounded-2xl p-6 text-center">
          <SearchX className="text-muted-foreground mx-auto mb-3 size-10" />
          <p className="font-semibold">{v.notFoundTitle}</p>
          <p className="text-muted-foreground mt-1 text-sm">{v.notFoundText}</p>
        </div>
      ) : (
        <div
          className={cn(
            "soft overflow-hidden rounded-2xl",
            tone === "bad" && "border-destructive/40",
          )}
        >
          <div
            className={cn(
              "flex items-center gap-3 px-6 py-4",
              tone === "ok" ? "bg-success/12" : "bg-destructive/10",
            )}
          >
            {tone === "ok" ? (
              <CheckCircle2 className="text-success size-7" />
            ) : (
              <ShieldAlert className="text-destructive size-7" />
            )}
            <div>
              <p className="font-semibold">{data.valid ? v.validTitle : v.revokedTitle}</p>
              <p className="text-muted-foreground text-sm">
                {data.valid ? v.validText : v.revokedText}
              </p>
            </div>
          </div>
          <dl className="grid gap-3 px-6 py-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">{t.campus.documents.kind}</dt>
              <dd className="font-semibold">{t.campus.documents.kinds[data.kind]}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t.campus.documents.issuedBy}</dt>
              <dd className="font-semibold">{data.institution}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t.campus.documents.holder}</dt>
              <dd className="font-semibold">
                {data.student_name}
                {data.student_number && ` (${data.student_number})`}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t.campus.documents.issuedAt}</dt>
              <dd className="font-semibold">{fmt.longDate(data.issued_at)}</dd>
            </div>
          </dl>
          {data.summary.length > 0 && (
            <ul className="grid gap-1.5 border-t px-6 py-4 text-sm">
              {data.summary.map((row, i) => (
                <li key={i} className="flex flex-wrap justify-between gap-2">
                  {data.kind === "transcript" ? (
                    <>
                      <span>
                        {String(row.period)} · {String(row.academic_year)}
                      </span>
                      <span className="font-semibold tabular-nums">
                        {formatNumber(row.average as number | null)} ·{" "}
                        {t.campus.results.creditsOf(
                          Number(row.credits_earned),
                          Number(row.credits_total),
                        )}
                      </span>
                    </>
                  ) : (
                    <span>
                      {String(row.program)} — {String(row.cohort)} · {String(row.academic_year)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="text-muted-foreground border-t px-6 py-3 font-mono text-xs">{data.code}</p>
        </div>
      )}
      <div className="mt-8">
        <VerifyForm />
      </div>
    </PublicShell>
  );
}

/* ---------- Invitation ---------- */

type InvitationInfo = {
  email: string;
  first_name: string | null;
  role: "admin" | "teacher" | "student";
  institution_name: string;
  expired: boolean;
  accepted: boolean;
};

export function InviteView({ token }: { token: string }) {
  const { t } = useI18n();
  const iv = t.campus.invite;
  const router = useRouter();
  const queryClient = useQueryClient();
  const info = useApi<InvitationInfo>(`/invitations/${encodeURIComponent(token)}`);
  const form = useForm<{ first_name: string; password: string }>({
    values: { first_name: info.data?.first_name ?? "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;
  const onSubmit = form.handleSubmit(async (v) => {
    try {
      const user = await api.post<User>(`/invitations/${encodeURIComponent(token)}/accept`, v);
      queryClient.clear();
      queryClient.setQueryData(queryKeys.me, user);
      router.replace(homeFor(user));
    } catch (error) {
      applyApiError(error, form.setError, ["first_name", "password"], t);
    }
  });
  const usable = info.data && !info.data.expired && !info.data.accepted;
  return (
    <AuthCard
      title={info.data ? iv.title(info.data.institution_name) : "CampusHub"}
      subtitle={usable ? iv.text(t.campus.roles[info.data!.role], info.data!.email) : ""}
      footer={{ text: t.auth.alreadyRegistered, linkLabel: t.auth.signIn, href: "/login" }}
    >
      {info.isPending ? (
        <Skeleton className="h-40" />
      ) : !usable ? (
        <FormError message={iv.unavailable} />
      ) : (
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormError message={errors.root?.server?.message} />
          <Field id="inv-first" label={t.auth.firstName} error={errors.first_name?.message}>
            <Input
              autoComplete="given-name"
              {...fieldA11y("inv-first", errors.first_name?.message)}
              {...form.register("first_name", { required: t.validation.firstNameRequired })}
            />
          </Field>
          <Field
            id="inv-password"
            label={t.auth.password}
            hint={t.auth.passwordHint}
            error={errors.password?.message}
          >
            <Input
              type="password"
              autoComplete="new-password"
              {...fieldA11y("inv-password", errors.password?.message)}
              {...form.register("password", {
                minLength: { value: 8, message: t.validation.passwordMin },
              })}
            />
          </Field>
          <Button type="submit" size="lg" className="mt-2 w-full" disabled={isSubmitting}>
            {isSubmitting ? iv.accepting : iv.accept}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}

/* ---------- Password reset ---------- */

export function ForgotPasswordView() {
  const { t } = useI18n();
  const p = t.campus.password;
  const [sent, setSent] = useState(false);
  const form = useForm<{ email: string }>({ defaultValues: { email: "" } });
  const { errors, isSubmitting } = form.formState;
  const onSubmit = form.handleSubmit(async (v) => {
    try {
      await api.post("/auth/password-reset", v);
      setSent(true);
    } catch (error) {
      applyApiError(error, form.setError, ["email"], t);
    }
  });
  return (
    <AuthCard
      title={p.forgotTitle}
      subtitle={p.forgotText}
      footer={{ text: "", linkLabel: p.backToLogin, href: "/login" }}
    >
      {sent ? (
        <p className="border-success/30 bg-success/10 rounded-lg border px-3.5 py-3 text-sm">
          {p.sentText}
        </p>
      ) : (
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormError message={errors.root?.server?.message} />
          <Field id="forgot-email" label={t.auth.email} error={errors.email?.message}>
            <Input
              type="email"
              autoComplete="email"
              {...fieldA11y("forgot-email", errors.email?.message)}
              {...form.register("email", { required: t.validation.emailRequired })}
            />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {p.send}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}

export function ResetPasswordView({ token }: { token: string }) {
  const { t } = useI18n();
  const p = t.campus.password;
  const [done, setDone] = useState(false);
  const form = useForm<{ password: string }>({ defaultValues: { password: "" } });
  const { errors, isSubmitting } = form.formState;
  const onSubmit = form.handleSubmit(async (v) => {
    try {
      await api.post("/auth/password-reset/confirm", { token, password: v.password });
      setDone(true);
    } catch (error) {
      applyApiError(error, form.setError, ["password"], t);
    }
  });
  return (
    <AuthCard
      title={p.resetTitle}
      subtitle={p.resetText}
      footer={{ text: "", linkLabel: p.backToLogin, href: "/login" }}
    >
      {done ? (
        <p className="border-success/30 bg-success/10 rounded-lg border px-3.5 py-3 text-sm">
          {p.done}
        </p>
      ) : (
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormError message={errors.root?.server?.message} />
          <Field
            id="reset-password"
            label={t.auth.password}
            hint={t.auth.passwordHint}
            error={errors.password?.message}
          >
            <Input
              type="password"
              autoComplete="new-password"
              {...fieldA11y("reset-password", errors.password?.message)}
              {...form.register("password", {
                minLength: { value: 8, message: t.validation.passwordMin },
              })}
            />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {p.reset}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
