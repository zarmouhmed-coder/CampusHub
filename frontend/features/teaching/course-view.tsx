"use client";

import { ArrowLeft, Eye, EyeOff, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { RequireRole } from "@/components/campus/guard";
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from "@/components/states";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, fieldA11y, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDateOnly } from "@/lib/format";
import { applyApiError } from "@/lib/form-errors";
import { useI18n } from "@/lib/i18n";
import { api, useApi, useApiMutation } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import type { AssessmentItem, CourseDetail, Institution, RosterEntry } from "@/types/api";

type NewValues = { title: string; weight: string; max_score: string; held_on: string };

function NewAssessment({
  course,
  institution,
  open,
  onClose,
  onCreated,
}: {
  course: string;
  institution: Institution;
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { t } = useI18n();
  const tt = t.campus.teaching;
  const form = useForm<NewValues>({
    values: { title: "", weight: "1", max_score: String(institution.grade_max), held_on: "" },
  });
  const create = useApiMutation(
    (v: NewValues) =>
      api.post<AssessmentItem>(`/teaching/courses/${course}/assessments`, {
        title: v.title,
        weight: Number(v.weight),
        max_score: Number(v.max_score),
        held_on: v.held_on || null,
      }),
    { invalidate: [`/teaching/courses/${course}`] },
  );
  const { errors, isSubmitting } = form.formState;
  const onSubmit = form.handleSubmit(async (v) => {
    try {
      const a = await create.mutateAsync(v);
      onCreated(a.id);
      onClose();
    } catch (error) {
      applyApiError(error, form.setError, ["title", "weight", "max_score"], t);
    }
  });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tt.newAssessment}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormError message={errors.root?.server?.message} />
          <Field
            id="as-title"
            label={t.campus.announcements.titleLabel}
            error={errors.title?.message}
          >
            <Input
              autoFocus
              {...fieldA11y("as-title", errors.title?.message)}
              {...form.register("title", { required: t.validation.invalid })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="as-weight" label={tt.weight}>
              <Input
                id="as-weight"
                type="number"
                step="0.5"
                min="0.5"
                {...form.register("weight")}
              />
            </Field>
            <Field id="as-max" label={tt.maxScore}>
              <Input id="as-max" type="number" step="1" min="1" {...form.register("max_score")} />
            </Field>
            <Field id="as-date" label={tt.heldOn} optional>
              <Input id="as-date" type="date" {...form.register("held_on")} />
            </Field>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="secondary" onClick={onClose}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {tt.newAssessment}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type Draft = Record<string, { score: string; absent: boolean }>;

function GradeGrid({ assessment }: { assessment: AssessmentItem }) {
  const { t } = useI18n();
  const roster = useApi<RosterEntry[]>(`/teaching/assessments/${assessment.id}/grades`);
  if (roster.isPending) return <ListSkeleton rows={4} />;
  if (roster.isError) return <ErrorState error={roster.error} onRetry={() => roster.refetch()} />;
  if (roster.data.length === 0)
    return <p className="text-muted-foreground text-sm">{t.campus.teaching.noStudents}</p>;
  // Keyed on the loaded data: the editable draft starts from the saved grades.
  return <GradeTable key={roster.dataUpdatedAt} assessment={assessment} roster={roster.data} />;
}

function GradeTable({ assessment, roster }: { assessment: AssessmentItem; roster: RosterEntry[] }) {
  const { t } = useI18n();
  const tt = t.campus.teaching;
  const [draft, setDraft] = useState<Draft>(() =>
    Object.fromEntries(
      roster.map((r) => [
        r.student_id,
        { score: r.score === null ? "" : String(r.score), absent: r.absent },
      ]),
    ),
  );
  const save = useApiMutation(
    () =>
      api.put(`/teaching/assessments/${assessment.id}/grades`, {
        grades: Object.entries(draft).map(([student_id, v]) => ({
          student_id,
          absent: v.absent,
          score: v.absent || v.score === "" ? null : Number(v.score.replace(",", ".")),
        })),
      }),
    {
      invalidate: [
        `/teaching/assessments/${assessment.id}`,
        `/teaching/courses/${assessment.course_id}`,
      ],
      success: tt.gradesSaved,
    },
  );
  const isBad = (v: { score: string; absent: boolean }) => {
    if (v.absent || v.score === "") return false;
    const n = Number(v.score.replace(",", "."));
    return Number.isNaN(n) || n < 0 || n > assessment.max_score;
  };
  const invalid = Object.values(draft).some(isBad);

  return (
    <div className="grid gap-3">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>{t.campus.common.student}</TableHead>
            <TableHead className="w-36">/ {assessment.max_score}</TableHead>
            <TableHead className="w-24">{tt.absent}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roster.map((r, index) => {
            const v = draft[r.student_id] ?? { score: "", absent: false };
            return (
              <TableRow key={r.student_id}>
                <TableCell>
                  <p className="font-medium">{r.first_name}</p>
                  <p className="text-muted-foreground text-xs">{r.student_number ?? r.email}</p>
                </TableCell>
                <TableCell>
                  <Input
                    inputMode="decimal"
                    aria-label={`${r.first_name} / ${assessment.max_score}`}
                    aria-invalid={isBad(v) || undefined}
                    disabled={v.absent}
                    value={v.absent ? "" : v.score}
                    className="h-9 w-24 text-right tabular-nums"
                    onChange={(e) =>
                      setDraft({ ...draft, [r.student_id]: { ...v, score: e.target.value } })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        document
                          .querySelectorAll<HTMLInputElement>("[data-grade]")
                          [index + 1]?.focus();
                      }
                    }}
                    data-grade
                  />
                </TableCell>
                <TableCell>
                  <input
                    type="checkbox"
                    aria-label={`${tt.absent} — ${r.first_name}`}
                    className="size-4 accent-[var(--destructive)]"
                    checked={v.absent}
                    onChange={(e) =>
                      setDraft({ ...draft, [r.student_id]: { ...v, absent: e.target.checked } })
                    }
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className="flex justify-end">
        <Button disabled={invalid || save.isPending} onClick={() => save.mutate(undefined)}>
          <Save /> {tt.saveGrades}
        </Button>
      </div>
    </div>
  );
}

function Course({ courseId, institution }: { courseId: string; institution: Institution }) {
  const { t } = useI18n();
  const tt = t.campus.teaching;
  const date = useDateOnly();
  const course = useApi<CourseDetail>(`/teaching/courses/${courseId}`);
  const assessments = useApi<AssessmentItem[]>(`/teaching/courses/${courseId}/assessments`);
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<AssessmentItem | null>(null);
  const toggle = useApiMutation(
    (a: AssessmentItem) => api.patch(`/teaching/assessments/${a.id}`, { published: !a.published }),
    { invalidate: [`/teaching/courses/${courseId}`] },
  );
  const remove = useApiMutation((id: string) => api.delete(`/teaching/assessments/${id}`), {
    invalidate: [`/teaching/courses/${courseId}`],
    success: t.campus.common.deleted,
  });
  const current = assessments.data?.find((a) => a.id === (selected ?? assessments.data?.[0]?.id));

  if (course.isError) return <ErrorState error={course.error} onRetry={() => course.refetch()} />;
  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
        <Link href="/teaching">
          <ArrowLeft /> {tt.backToCourses}
        </Link>
      </Button>
      <PageHeader
        title={course.data?.name ?? "…"}
        meta={course.data ? `${course.data.cohort.name} · ${course.data.period.name}` : undefined}
        description={
          course.data
            ? `${course.data.unit.name} · ${t.campus.common.coefficient} ${course.data.coefficient} · ${tt.students(course.data.students)}`
            : undefined
        }
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus /> {tt.newAssessment}
          </Button>
        }
      />
      {assessments.isPending ? (
        <ListSkeleton />
      ) : !assessments.data?.length ? (
        <EmptyState
          icon={Plus}
          title={tt.noAssessments}
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus /> {tt.newAssessment}
            </Button>
          }
        />
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle>{tt.assessments}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-1">
              {assessments.data.map((a) => (
                <div
                  key={a.id}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2 py-2 transition-colors",
                    a.id === current?.id ? "bg-surface shadow-soft" : "hover:bg-surface/70",
                  )}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setSelected(a.id)}
                  >
                    <p className="truncate text-sm font-medium">{a.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {tt.weight} {a.weight} · /{a.max_score} · {date(a.held_on)} ·{" "}
                      {tt.graded(a.graded, course.data?.students ?? 0)}
                    </p>
                  </button>
                  <Badge variant={a.published ? "success" : "neutral"}>
                    {a.published ? tt.published : tt.draft}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
          {current && (
            <Card>
              <CardHeader className="flex-wrap">
                <CardTitle>
                  {tt.gradeGrid} — {current.title}
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={current.published ? "secondary" : "default"}
                    onClick={() =>
                      toggle.mutate(current, {
                        onSuccess: () =>
                          toast.success(
                            current.published ? tt.unpublishedToast : tt.publishedToast,
                          ),
                      })
                    }
                  >
                    {current.published ? (
                      <>
                        <EyeOff /> {tt.unpublish}
                      </>
                    ) : (
                      <>
                        <Eye /> {tt.publish}
                      </>
                    )}
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={t.common.delete}
                    onClick={() => setDeleting(current)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <GradeGrid key={current.id} assessment={current} />
              </CardContent>
            </Card>
          )}
        </div>
      )}
      <NewAssessment
        course={courseId}
        institution={institution}
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={setSelected}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t.campus.common.deleteTitle}
        description={t.campus.common.deleteText}
        onConfirm={() => remove.mutateAsync(deleting!.id).then(() => setSelected(null))}
      />
    </>
  );
}

export function CourseView({ courseId }: { courseId: string }) {
  return (
    <RequireRole roles={["teacher", "admin"]} module="grades">
      {({ institution }) => <Course courseId={courseId} institution={institution} />}
    </RequireRole>
  );
}
