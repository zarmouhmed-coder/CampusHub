"use client";

import { Megaphone, Plus, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { RequireRole } from "@/components/campus/guard";
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from "@/components/states";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, fieldA11y, FormError } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { applyApiError } from "@/lib/form-errors";
import { useI18n } from "@/lib/i18n";
import { api, useApi, useApiMutation } from "@/lib/use-api";
import { useFormat } from "@/lib/use-format";
import type { AnnouncementItem, Cohort, CourseDetail, Role } from "@/types/api";

type Values = {
  title: string;
  body: string;
  audience: AnnouncementItem["audience"];
  cohort_id: string;
};

function Compose({ open, onClose, role }: { open: boolean; onClose: () => void; role: Role }) {
  const { t } = useI18n();
  const a = t.campus.announcements;
  const isAdmin = role === "admin";
  // Admins: every cohort. Teachers: only the cohorts of their courses.
  const allCohorts = useApi<Cohort[]>(open && isAdmin ? "/school/cohorts" : null);
  const myCourses = useApi<CourseDetail[]>(open && !isAdmin ? "/teaching/courses" : null);
  const cohorts = useMemo(() => {
    if (isAdmin) return (allCohorts.data ?? []).map((c) => ({ id: c.id, name: c.name }));
    const seen = new Map<string, string>();
    for (const c of myCourses.data ?? []) seen.set(c.cohort.id, c.cohort.name);
    return [...seen].map(([id, name]) => ({ id, name }));
  }, [isAdmin, allCohorts.data, myCourses.data]);
  const form = useForm<Values>({
    values: { title: "", body: "", audience: isAdmin ? "all" : "cohort", cohort_id: "" },
  });
  const publish = useApiMutation(
    (v: Values) =>
      api.post("/announcements", { ...v, cohort_id: v.audience === "cohort" ? v.cohort_id : null }),
    { invalidate: ["/announcements"], success: a.published },
  );
  const { errors, isSubmitting } = form.formState;
  const audience = useWatch({ control: form.control, name: "audience" });
  const onSubmit = form.handleSubmit(async (v) => {
    try {
      await publish.mutateAsync(v);
      form.reset();
      onClose();
    } catch (error) {
      applyApiError(error, form.setError, ["title", "body", "cohort_id"], t);
    }
  });
  const audiences = isAdmin
    ? (["all", "students", "teachers", "cohort"] as const)
    : (["cohort"] as const);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{a.new}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormError message={errors.root?.server?.message} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="ann-audience" label={a.audience}>
              <NativeSelect id="ann-audience" {...form.register("audience")}>
                {audiences.map((x) => (
                  <option key={x} value={x}>
                    {a.audiences[x]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            {audience === "cohort" && (
              <Field
                id="ann-cohort"
                label={t.campus.common.cohort}
                error={errors.cohort_id?.message}
              >
                <NativeSelect
                  {...fieldA11y("ann-cohort", errors.cohort_id?.message)}
                  {...form.register("cohort_id", { required: t.validation.invalid })}
                >
                  <option value="">{t.campus.common.select}</option>
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            )}
          </div>
          <Field id="ann-title" label={a.titleLabel} error={errors.title?.message}>
            <Input
              {...fieldA11y("ann-title", errors.title?.message)}
              maxLength={200}
              {...form.register("title", { required: t.validation.invalid })}
            />
          </Field>
          <Field id="ann-body" label={a.body} error={errors.body?.message}>
            <Textarea
              rows={6}
              maxLength={5000}
              {...fieldA11y("ann-body", errors.body?.message)}
              {...form.register("body", { required: t.validation.invalid })}
            />
          </Field>
          <DialogFooter className="mt-2">
            <Button variant="secondary" onClick={onClose}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Megaphone /> {a.new}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Announcements({ role }: { role: Role }) {
  const { t } = useI18n();
  const a = t.campus.announcements;
  const fmt = useFormat();
  const feed = useApi<AnnouncementItem[]>("/announcements");
  const [composing, setComposing] = useState(false);
  const [deleting, setDeleting] = useState<AnnouncementItem | null>(null);
  const remove = useApiMutation((id: string) => api.delete(`/announcements/${id}`), {
    invalidate: ["/announcements"],
    success: a.deleted,
  });
  const canPublish = role !== "student";
  return (
    <>
      <PageHeader
        title={a.title}
        description={a.subtitle}
        actions={
          canPublish ? (
            <Button onClick={() => setComposing(true)}>
              <Plus /> {a.new}
            </Button>
          ) : undefined
        }
      />
      {feed.isPending ? (
        <ListSkeleton />
      ) : feed.isError ? (
        <ErrorState error={feed.error} onRetry={() => feed.refetch()} />
      ) : feed.data.length === 0 ? (
        <EmptyState icon={Megaphone} title={a.empty} />
      ) : (
        <ul className="mx-auto grid max-w-3xl gap-3">
          {feed.data.map((n) => (
            <li key={n.id} className="soft rounded-2xl p-5">
              <div className="text-muted-foreground mb-2 flex flex-wrap items-center gap-2 text-xs">
                <Badge variant={n.audience === "cohort" ? "accent" : "neutral"}>
                  <Users /> {n.cohort ? n.cohort.name : a.audiences[n.audience]}
                </Badge>
                <span>{fmt.dateTime(n.created_at)}</span>
                {n.author && <span>· {a.by(n.author)}</span>}
                {n.can_delete && (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="ml-auto"
                    aria-label={t.common.delete}
                    onClick={() => setDeleting(n)}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
              <h2 className="font-display text-lg font-semibold">{n.title}</h2>
              <p className="text-foreground/85 mt-1 text-sm leading-relaxed whitespace-pre-line">
                {n.body}
              </p>
            </li>
          ))}
        </ul>
      )}
      {canPublish && <Compose open={composing} onClose={() => setComposing(false)} role={role} />}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t.campus.common.deleteTitle}
        description={t.campus.common.deleteText}
        onConfirm={() => remove.mutateAsync(deleting!.id)}
      />
    </>
  );
}

export function AnnouncementsView() {
  return (
    <RequireRole roles={["admin", "teacher", "student"]} module="announcements">
      {({ user }) => <Announcements role={user.role as Role} />}
    </RequireRole>
  );
}
