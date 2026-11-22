"use client";

import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CircleDashed,
  ClipboardList,
  Clock,
  GraduationCap,
  PartyPopper,
  Plus,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { useQuickAdd } from "@/components/layout/quick-add";
import { EmptyState, ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { AssignmentItem, useSetAssignmentStatus } from "@/features/assignments/assignment-item";
import { useAssignmentDialogs } from "@/features/assignments/use-assignment-dialogs";
import { useCurrentUser } from "@/features/auth/api";
import { ExamItem } from "@/features/exams/exam-item";
import { useExamDialogs } from "@/features/exams/use-exam-dialogs";
import { SubjectTile } from "@/features/subjects/subject-dot";
import { startOfWeek } from "@/lib/dates";
import { useI18n } from "@/lib/i18n";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";
import type { Assignment, DashboardSummary, Exam } from "@/types/api";

import { useDashboard, useWeekItems } from "./api";
import { ProgressGauge } from "./progress-gauge";
import { WeekStrip } from "./week-strip";

type Tab = "day" | "upcoming" | "overdue";

function Kpi({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: "default" | "danger" | "gold";
}) {
  const alert = tone === "danger" && value > 0;
  return (
    <div
      className={cn(
        "soft flex items-center gap-3 rounded-xl px-3.5 py-3",
        alert && "border-destructive/30",
      )}
    >
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-lg",
          alert
            ? "bg-destructive/10 text-destructive"
            : tone === "gold"
              ? "bg-gold/15 text-gold-foreground"
              : "bg-accent text-accent-foreground",
        )}
      >
        <Icon className="size-[1.05rem]" strokeWidth={1.9} />
      </span>
      <div className="min-w-0">
        <p
          className={cn(
            "font-display text-xl leading-none font-semibold tabular-nums",
            alert && "text-destructive",
          )}
        >
          {value}
        </p>
        <p className="text-muted-foreground mt-1 truncate text-xs">{label}</p>
      </div>
    </div>
  );
}

function Header({ summary }: { summary: DashboardSummary }) {
  const { t } = useI18n();
  const fmt = useFormat();
  const { data: user } = useCurrentUser();
  const { overdue, due_this_week } = summary.counts;
  const subtitle =
    overdue > 0
      ? t.dashboard.subtitleOverdue(overdue)
      : due_this_week > 0
        ? t.dashboard.subtitleWeek(due_this_week)
        : t.dashboard.subtitleCalm;
  return (
    <div>
      <p className="text-gold-foreground text-xs font-semibold tracking-wider uppercase first-letter:uppercase">
        {fmt.longDate(new Date())}
      </p>
      <h1 className="font-display mt-1 text-[1.75rem] leading-tight font-semibold tracking-tight sm:text-3xl">
        {user ? t.dashboard.hello(user.first_name) : t.dashboard.title}
      </h1>
      <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>
    </div>
  );
}

function WeekProgressCard({ week }: { week: DashboardSummary["week"] }) {
  const { t } = useI18n();
  const legend = [
    { label: t.dashboard.weekLegendDone, value: week.done, dot: "bg-success" },
    { label: t.dashboard.weekLegendProgress, value: week.in_progress, dot: "bg-warning" },
    { label: t.dashboard.weekLegendTodo, value: week.todo, dot: "bg-input" },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.dashboard.weekTitle}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] items-center gap-3">
        <ul className="grid gap-2 text-sm">
          {legend.map((item) => (
            <li key={item.label} className="flex items-center gap-2">
              <span aria-hidden className={cn("size-2 rounded-full", item.dot)} />
              <span className="text-muted-foreground truncate">{item.label}</span>
              <span className="ml-auto font-semibold tabular-nums">{item.value}</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-center">
          {week.total === 0 ? (
            <div className="text-muted-foreground py-3 text-center text-xs">
              <Sparkles className="text-gold mx-auto mb-1.5 size-5" />
              {t.dashboard.weekEmpty}
            </div>
          ) : (
            <ProgressGauge done={week.done} inProgress={week.in_progress} total={week.total} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function NextUpCard({ summary }: { summary: DashboardSummary }) {
  const { t } = useI18n();
  const fmt = useFormat();
  const { setStatus, pending } = useSetAssignmentStatus();
  const assignment = summary.upcoming_assignments[0];
  const exam = summary.upcoming_exams[0];
  const next: { kind: "assignment"; item: Assignment } | { kind: "exam"; item: Exam } | null =
    assignment && (!exam || assignment.due_at <= exam.exam_at)
      ? { kind: "assignment", item: assignment }
      : exam
        ? { kind: "exam", item: exam }
        : null;

  return (
    <Card className="relative overflow-hidden">
      <span
        aria-hidden
        className="from-gold to-primary absolute inset-y-0 left-0 w-1 bg-gradient-to-b"
      />
      <CardHeader>
        <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          {t.dashboard.nextUp}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {next === null ? (
          <p className="text-muted-foreground text-sm">{t.dashboard.nothingNext}</p>
        ) : (
          <div className="flex items-center gap-3">
            <SubjectTile
              color={next.item.subject?.color}
              icon={next.kind === "assignment" ? ClipboardList : GraduationCap}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{next.item.title}</p>
              <p className="text-muted-foreground truncate text-xs">
                {fmt.relative(next.kind === "assignment" ? next.item.due_at : next.item.exam_at)}
                {next.item.subject && ` · ${next.item.subject.name}`}
              </p>
            </div>
            {next.kind === "assignment" ? (
              <Button
                size="sm"
                disabled={pending}
                onClick={() => setStatus(next.item, "done")}
                aria-label={t.dashboard.markDoneAria(next.item.title)}
              >
                {t.dashboard.markDone}
              </Button>
            ) : (
              <Button asChild size="sm" variant="secondary">
                <Link href="/exams">{t.dashboard.view}</Link>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SeeAll({ href }: { href: string }) {
  const { t } = useI18n();
  return (
    <Button asChild variant="ghost" size="sm" className="-mr-2">
      <Link href={href}>
        {t.common.seeAll} <ArrowRight />
      </Link>
    </Button>
  );
}

function DashboardContent({ summary }: { summary: DashboardSummary }) {
  const { t } = useI18n();
  const fmt = useFormat();
  // Only rendered in the browser (after data loaded): reading the clock is safe.
  const today = fmt.dayKey(new Date());
  const [selectedDay, setSelectedDay] = useState(today);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));
  const [tab, setTab] = useState<Tab>("upcoming");
  const week = useWeekItems(weekStart, fmt.dayStart);
  const assignmentDialogs = useAssignmentDialogs();
  const examDialogs = useExamDialogs();
  const { addSubject, addAssignment, addExam } = useQuickAdd();

  const busyDays = useMemo(
    () =>
      new Set([
        ...week.assignments.filter((a) => a.status !== "done").map((a) => fmt.dayKey(a.due_at)),
        ...week.exams.map((e) => fmt.dayKey(e.exam_at)),
      ]),
    [week.assignments, week.exams, fmt],
  );

  const dayItems = useMemo(() => {
    const items = [
      ...week.assignments
        .filter((a) => fmt.dayKey(a.due_at) === selectedDay)
        .map((a) => ({ kind: "assignment" as const, at: a.due_at, item: a })),
      ...week.exams
        .filter((e) => fmt.dayKey(e.exam_at) === selectedDay)
        .map((e) => ({ kind: "exam" as const, at: e.exam_at, item: e })),
    ];
    return items.sort((a, b) => a.at.localeCompare(b.at));
  }, [week.assignments, week.exams, selectedDay, fmt]);

  const selectDay = (day: string) => {
    setSelectedDay(day);
    setWeekStart(startOfWeek(day));
    setTab("day");
  };

  const assignmentRow = (a: Assignment) => (
    <AssignmentItem
      key={a.id}
      assignment={a}
      onEdit={assignmentDialogs.openEdit}
      onDelete={assignmentDialogs.askDelete}
      compact
      surface="plain"
    />
  );
  const examRow = (e: Exam) => (
    <ExamItem
      key={e.id}
      exam={e}
      onEdit={examDialogs.openEdit}
      onDelete={examDialogs.askDelete}
      surface="plain"
    />
  );

  const tabs = [
    { value: "day", label: selectedDay === today ? t.common.today : fmt.shortDay(selectedDay) },
    { value: "upcoming", label: t.dashboard.tabUpcoming },
    { value: "overdue", label: t.dashboard.tabOverdue, count: summary.counts.overdue },
  ] as const;

  return (
    <div className="grid grid-cols-1 gap-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <Header summary={summary} />
        <section
          aria-label={t.dashboard.summary}
          className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:w-[44rem]"
        >
          <Kpi label={t.dashboard.kpiTodo} value={summary.counts.todo} icon={CircleDashed} />
          <Kpi label={t.dashboard.kpiInProgress} value={summary.counts.in_progress} icon={Clock} />
          <Kpi
            label={t.dashboard.kpiOverdue}
            value={summary.counts.overdue}
            icon={AlertTriangle}
            tone="danger"
          />
          <Kpi
            label={t.dashboard.kpiExams}
            value={summary.counts.upcoming_exams}
            icon={GraduationCap}
            tone="gold"
          />
        </section>
      </div>

      {summary.counts.subjects === 0 && (
        <div className="relative flex flex-col gap-4 overflow-hidden rounded-2xl bg-[linear-gradient(135deg,oklch(0.3_0.09_266),oklch(0.22_0.06_268))] p-5 text-white sm:flex-row sm:items-center sm:justify-between">
          <div
            aria-hidden
            className="absolute -top-16 -right-10 size-48 rounded-full bg-[oklch(0.72_0.12_80/0.25)] blur-2xl"
          />
          <div className="relative flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/12">
              <BookOpen className="size-5" />
            </span>
            <div>
              <p className="font-semibold">{t.dashboard.firstSubjectTitle}</p>
              <p className="text-sm text-white/70">{t.dashboard.firstSubjectText}</p>
            </div>
          </div>
          <Button
            onClick={addSubject}
            className="relative shrink-0 bg-white text-[oklch(0.25_0.06_267)] hover:bg-white/90"
          >
            <Plus /> {t.subjects.addFirst}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        <div className="grid grid-cols-1 gap-5 lg:col-span-8">
          {/* Mobile: the next deadline comes first. Desktop: it heads the side column. */}
          <div className="lg:hidden">
            <NextUpCard summary={summary} />
          </div>
          <WeekStrip
            weekStart={weekStart}
            selected={selectedDay}
            today={today}
            busyDays={busyDays}
            onSelect={selectDay}
            onWeekChange={setWeekStart}
          />

          <Card>
            <CardHeader className="flex-wrap">
              <CardTitle>{t.dashboard.programme}</CardTitle>
              <div className="flex items-center gap-2">
                <Segmented label={t.dashboard.show} value={tab} onChange={setTab} options={tabs} />
              </div>
            </CardHeader>
            <CardContent className="pt-1">
              {tab === "day" &&
                (week.isPending ? (
                  <Skeleton className="h-28" />
                ) : dayItems.length === 0 ? (
                  <EmptyState
                    icon={CalendarDays}
                    title={t.dashboard.nothingDay}
                    bare
                    className="py-8"
                  />
                ) : (
                  <ul className="grid grid-cols-1 gap-0.5">
                    {dayItems.map((entry) =>
                      entry.kind === "assignment" ? assignmentRow(entry.item) : examRow(entry.item),
                    )}
                  </ul>
                ))}

              {tab === "upcoming" &&
                (summary.upcoming_assignments.length === 0 ? (
                  <EmptyState
                    icon={ClipboardList}
                    title={t.dashboard.noUpcoming}
                    description={t.dashboard.noUpcomingText}
                    action={
                      <Button variant="secondary" onClick={addAssignment}>
                        <Plus /> {t.assignments.addFirst}
                      </Button>
                    }
                    bare
                    className="py-8"
                  />
                ) : (
                  <ul className="grid grid-cols-1 gap-0.5">
                    {summary.upcoming_assignments.map(assignmentRow)}
                  </ul>
                ))}

              {tab === "overdue" &&
                (summary.overdue_assignments.length === 0 ? (
                  <EmptyState
                    icon={PartyPopper}
                    title={t.dashboard.noOverdue}
                    bare
                    className="py-8"
                  />
                ) : (
                  <ul className="grid grid-cols-1 gap-0.5">
                    {summary.overdue_assignments.map(assignmentRow)}
                  </ul>
                ))}
              <div className="mt-3 flex justify-end border-t pt-2">
                <SeeAll href="/assignments" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:col-span-4">
          <div className="hidden lg:block">
            <NextUpCard summary={summary} />
          </div>
          <WeekProgressCard week={summary.week} />
          <Card>
            <CardHeader>
              <CardTitle>{t.dashboard.upcomingExams}</CardTitle>
              <SeeAll href="/exams" />
            </CardHeader>
            <CardContent>
              {summary.upcoming_exams.length === 0 ? (
                <EmptyState
                  icon={GraduationCap}
                  title={t.dashboard.noExams}
                  description={t.dashboard.noExamsText}
                  action={
                    <Button variant="secondary" size="sm" onClick={addExam}>
                      <Plus /> {t.exams.addFirst}
                    </Button>
                  }
                  bare
                  className="py-6"
                />
              ) : (
                <ul className="grid grid-cols-1 gap-0.5">{summary.upcoming_exams.map(examRow)}</ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {assignmentDialogs.dialogs}
      {examDialogs.dialogs}
    </div>
  );
}

function DashboardSkeleton() {
  const { t } = useI18n();
  return (
    <div aria-busy="true" aria-label={t.dashboard.loading} className="grid gap-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:justify-between">
        <Skeleton className="h-20 w-72" />
        <Skeleton className="h-16 xl:w-[44rem]" />
      </div>
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="grid gap-5 lg:col-span-8">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
        <div className="grid gap-5 lg:col-span-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export function DashboardView() {
  const dashboard = useDashboard();
  if (dashboard.isPending) return <DashboardSkeleton />;
  if (dashboard.isError)
    return <ErrorState error={dashboard.error} onRetry={() => dashboard.refetch()} />;
  return <DashboardContent summary={dashboard.data} />;
}
