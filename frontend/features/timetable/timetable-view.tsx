"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  MapPin,
  Plus,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { RequireRole } from "@/components/campus/guard";
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from "@/components/states";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, fieldA11y, FormError } from "@/components/ui/field";
import { Input, NativeSelect } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { useStructure, useTeachers } from "@/features/school/use-structure";
import { addDays, dayOfMonth, startOfWeek } from "@/lib/dates";
import { applyApiError } from "@/lib/form-errors";
import { useI18n } from "@/lib/i18n";
import { api, useApi, useApiMutation } from "@/lib/use-api";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";
import type {
  AttendanceEntry,
  AttendanceStatus,
  ClassSession,
  CourseDetail,
  Institution,
  Role,
} from "@/types/api";

const STATUSES: AttendanceStatus[] = ["present", "absent", "late", "excused"];

function AttendanceDialog({
  session,
  onClose,
}: {
  session: ClassSession | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const tt = t.campus.timetable;
  const roster = useApi<AttendanceEntry[]>(
    session ? `/teaching/sessions/${session.id}/attendance` : null,
  );
  const [draft, setDraft] = useState<Record<string, AttendanceStatus>>({});
  const value = (e: AttendanceEntry) => draft[e.student_id] ?? e.status ?? "present";
  const save = useApiMutation(
    () =>
      api.put(`/teaching/sessions/${session!.id}/attendance`, {
        records: (roster.data ?? []).map((e) => ({ student_id: e.student_id, status: value(e) })),
      }),
    { invalidate: ["/teaching/sessions", "/school/attendance"], success: tt.attendanceSaved },
  );
  const options = STATUSES.map((s) => ({ value: s, label: tt.statuses[s] }));
  return (
    <Dialog
      open={session !== null}
      onOpenChange={(o) => {
        if (!o) {
          setDraft({});
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{session ? tt.attendanceTitle(session.course.name) : ""}</DialogTitle>
        </DialogHeader>
        {roster.isPending ? (
          <ListSkeleton rows={3} />
        ) : roster.isError ? (
          <ErrorState error={roster.error} />
        ) : roster.data.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t.campus.teaching.noStudents}</p>
        ) : (
          <div className="grid max-h-[55dvh] gap-2 overflow-y-auto">
            <Button
              variant="secondary"
              size="sm"
              className="justify-self-end"
              onClick={() =>
                setDraft(
                  Object.fromEntries(roster.data.map((e) => [e.student_id, "present" as const])),
                )
              }
            >
              {tt.allPresent}
            </Button>
            {roster.data.map((e) => (
              <div
                key={e.student_id}
                className="bg-surface/70 flex flex-col gap-2 rounded-lg px-3 py-2 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.first_name}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {e.student_number ?? e.email}
                  </p>
                </div>
                <Segmented
                  label={e.first_name}
                  value={value(e)}
                  onChange={(v) => setDraft({ ...draft, [e.student_id]: v })}
                  options={options}
                />
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button
            disabled={!roster.data?.length || save.isPending}
            onClick={() =>
              save.mutate(undefined, {
                onSuccess: () => {
                  setDraft({});
                  onClose();
                },
              })
            }
          >
            {t.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type SessionValues = {
  course_id: string;
  room_id: string;
  date: string;
  start: string;
  end: string;
  kind: string;
  repeat: string;
};

function AddSession({
  open,
  onClose,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  defaultDate: string;
}) {
  const { t } = useI18n();
  const tt = t.campus.timetable;
  const fmt = useFormat();
  const ref = useStructure();
  const courses = useApi<CourseDetail[]>(open ? "/teaching/courses" : null);
  const form = useForm<SessionValues>({
    values: {
      course_id: "",
      room_id: "",
      date: defaultDate,
      start: "08:00",
      end: "10:00",
      kind: "",
      repeat: "0",
    },
  });
  const create = useApiMutation(
    (v: SessionValues) =>
      api.post<ClassSession[]>("/school/sessions", {
        course_id: v.course_id,
        room_id: v.room_id || null,
        starts_at: fmt.fromInput(`${v.date}T${v.start}`),
        ends_at: fmt.fromInput(`${v.date}T${v.end}`),
        kind: v.kind || null,
        repeat_weeks: Number(v.repeat),
      }),
    { invalidate: ["/timetable", "/school/overview"] },
  );
  const { errors, isSubmitting } = form.formState;
  const onSubmit = form.handleSubmit(async (v) => {
    try {
      const created = await create.mutateAsync(v);
      toast.success(tt.created(created.length));
      onClose();
    } catch (error) {
      applyApiError(error, form.setError, ["course_id", "room_id"], t);
    }
  });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tt.addSession}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormError message={errors.root?.server?.message} />
          <Field id="ses-course" label={tt.course} error={errors.course_id?.message}>
            <NativeSelect
              {...fieldA11y("ses-course", errors.course_id?.message)}
              {...form.register("course_id", { required: t.validation.invalid })}
            >
              <option value="">{t.campus.common.select}</option>
              {courses.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.cohort.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="ses-date" label={t.campus.common.date}>
              <Input id="ses-date" type="date" {...form.register("date", { required: true })} />
            </Field>
            <Field id="ses-start" label={t.campus.common.startTime}>
              <Input id="ses-start" type="time" {...form.register("start", { required: true })} />
            </Field>
            <Field id="ses-end" label={t.campus.common.endTime}>
              <Input id="ses-end" type="time" {...form.register("end", { required: true })} />
            </Field>
            <Field id="ses-room" label={t.campus.common.room} optional>
              <NativeSelect id="ses-room" {...form.register("room_id")}>
                <option value="">{t.campus.common.none}</option>
                {ref.options(ref.rooms.data).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id="ses-kind" label={tt.kind} optional>
              <Input id="ses-kind" maxLength={20} {...form.register("kind")} />
            </Field>
            <Field id="ses-repeat" label={tt.repeat}>
              <NativeSelect id="ses-repeat" {...form.register("repeat")}>
                {[0, 1, 3, 7, 11, 14].map((n) => (
                  <option key={n} value={n}>
                    {tt.repeatWeeks(n)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="secondary" onClick={onClose}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {tt.addSession}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Timetable({ role, institution }: { role: Role; institution: Institution }) {
  const { t } = useI18n();
  const tt = t.campus.timetable;
  const fmt = useFormat();
  const ref = useStructure();
  const teachers = useTeachers();
  const today = fmt.dayKey(new Date());
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));
  const [filter, setFilter] = useState<{ kind: "all" | "cohort" | "room" | "teacher"; id: string }>(
    { kind: "all", id: "" },
  );
  const [adding, setAdding] = useState(false);
  const [rollCall, setRollCall] = useState<ClassSession | null>(null);
  const isAdmin = role === "admin";
  const canRoll = role !== "student" && institution.modules.includes("attendance");

  const days = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i));
  const sessions = useApi<ClassSession[]>("/timetable", {
    start: fmt.dayStart(weekStart),
    end: fmt.dayStart(addDays(weekStart, 7)),
    ...(isAdmin && filter.id ? { [`${filter.kind}_id`]: filter.id } : {}),
  });
  const remove = useApiMutation((id: string) => api.delete(`/school/sessions/${id}`), {
    invalidate: ["/timetable"],
    success: t.campus.common.deleted,
  });
  const byDay = useMemo(() => {
    const map: Record<string, ClassSession[]> = {};
    for (const s of sessions.data ?? []) (map[fmt.dayKey(s.starts_at)] ??= []).push(s);
    return map;
  }, [sessions.data, fmt]);
  const filterOptions =
    filter.kind === "cohort"
      ? ref.options(ref.cohorts.data)
      : filter.kind === "room"
        ? ref.options(ref.rooms.data)
        : (teachers.data ?? []).map((m) => ({ value: m.id, label: m.first_name }));

  return (
    <>
      <PageHeader
        title={tt.title}
        description={tt.weekOf(fmt.shortDay(weekStart))}
        actions={
          isAdmin ? (
            <Button onClick={() => setAdding(true)}>
              <Plus /> {tt.addSession}
            </Button>
          ) : undefined
        }
      />
      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-1">
          <Button
            variant="secondary"
            size="icon-sm"
            aria-label={tt.previousWeek}
            onClick={() => setWeekStart(addDays(weekStart, -7))}
          >
            <ChevronLeft />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setWeekStart(startOfWeek(today))}>
            {tt.thisWeek}
          </Button>
          <Button
            variant="secondary"
            size="icon-sm"
            aria-label={tt.nextWeek}
            onClick={() => setWeekStart(addDays(weekStart, 7))}
          >
            <ChevronRight />
          </Button>
        </div>
        {isAdmin && (
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <NativeSelect
              aria-label={tt.filterAll}
              value={filter.kind}
              onChange={(e) => setFilter({ kind: e.target.value as typeof filter.kind, id: "" })}
              className="sm:w-48"
            >
              <option value="all">{tt.filterAll}</option>
              <option value="cohort">{t.campus.common.cohort}</option>
              <option value="room">{t.campus.common.room}</option>
              <option value="teacher">{t.campus.common.teacher}</option>
            </NativeSelect>
            {filter.kind !== "all" && (
              <NativeSelect
                aria-label={t.campus.common.select}
                value={filter.id}
                onChange={(e) => setFilter({ ...filter, id: e.target.value })}
                className="sm:w-56"
              >
                <option value="">{t.campus.common.select}</option>
                {filterOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </NativeSelect>
            )}
          </div>
        )}
      </div>

      {sessions.isPending ? (
        <ListSkeleton rows={4} />
      ) : sessions.isError ? (
        <ErrorState error={sessions.error} onRetry={() => sessions.refetch()} />
      ) : sessions.data.length === 0 ? (
        <EmptyState icon={CalendarDays} title={tt.noSessions} />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {days.map((day) => (
            <section
              key={day}
              className={cn("soft rounded-2xl p-2", day === today && "ring-primary/40 ring-2")}
            >
              <h2 className="flex items-baseline gap-1.5 px-2 pt-1 pb-2">
                <span className="text-muted-foreground text-xs font-semibold uppercase">
                  {fmt.weekday(day).replace(".", "")}
                </span>
                <span
                  className={cn(
                    "font-display text-lg font-semibold",
                    day === today && "text-primary",
                  )}
                >
                  {dayOfMonth(day)}
                </span>
              </h2>
              <ul className="grid gap-1.5">
                {(byDay[day] ?? []).map((s) => (
                  <li
                    key={s.id}
                    className="border-primary bg-surface rounded-xl border-l-[3px] px-2.5 py-2"
                  >
                    <div className="flex items-start gap-1">
                      <div className="min-w-0 flex-1">
                        <p className="text-primary text-xs font-semibold tabular-nums">
                          {fmt.time(s.starts_at)} – {fmt.time(s.ends_at)}{" "}
                          {s.kind && <span className="text-muted-foreground">· {s.kind}</span>}
                        </p>
                        <p className="truncate text-sm font-semibold">{s.course.name}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {role === "student" ? (s.teacher?.name ?? "") : s.cohort.name}
                          {s.room && (
                            <span className="inline-flex items-center gap-0.5">
                              {" "}
                              · <MapPin className="size-3" />
                              {s.room.name}
                            </span>
                          )}
                        </p>
                      </div>
                      {(canRoll || isAdmin) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="-mr-1 size-7"
                              aria-label={t.common.actionsFor(s.course.name)}
                            >
                              <ClipboardCheck />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canRoll && (
                              <DropdownMenuItem onSelect={() => setRollCall(s)}>
                                <ClipboardCheck /> {tt.takeAttendance}
                              </DropdownMenuItem>
                            )}
                            {isAdmin && (
                              <DropdownMenuItem
                                variant="destructive"
                                onSelect={() => remove.mutate(s.id)}
                              >
                                <Trash2 /> {tt.deleteSession}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      {isAdmin && (
        <AddSession
          open={adding}
          onClose={() => setAdding(false)}
          defaultDate={weekStart < today ? today : weekStart}
        />
      )}
      <AttendanceDialog session={rollCall} onClose={() => setRollCall(null)} />
    </>
  );
}

export function TimetableView() {
  return (
    <RequireRole roles={["admin", "teacher", "student"]} module="timetable">
      {({ user, institution }) => <Timetable role={user.role as Role} institution={institution} />}
    </RequireRole>
  );
}
