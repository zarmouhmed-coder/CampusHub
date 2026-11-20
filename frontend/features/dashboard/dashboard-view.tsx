"use client";

import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  PartyPopper,
  Plus,
  Sparkles,
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
import { formatRelative, parisDayKey, shortDay, startOfWeek } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { Assignment, DashboardSummary, Exam } from "@/types/api";

import { useDashboard, useWeekItems } from "./api";
import { ProgressGauge } from "./progress-gauge";
import { WeekStrip } from "./week-strip";

type Tab = "day" | "upcoming" | "overdue" | "exams";

function plural(n: number, word: string) {
  return `${n} ${word}${n > 1 ? "s" : ""}`;
}

function Greeting({ summary }: { summary: DashboardSummary }) {
  const { data: user } = useCurrentUser();
  const { overdue, due_this_week } = summary.counts;
  const subtitle =
    overdue > 0
      ? `Tu as ${plural(overdue, "devoir")} en retard. On s'y met ?`
      : due_this_week > 0
        ? `${plural(due_this_week, "rendu")} dans les 7 prochains jours.`
        : "Rien d'urgent à l'horizon, profites-en.";

  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[1.75rem] leading-tight font-extrabold tracking-tight sm:text-3xl">
          {user ? `Bonjour ${user.first_name}` : "Bonjour"}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">{subtitle}</p>
      </div>
    </div>
  );
}

function WeekProgressCard({ week }: { week: DashboardSummary["week"] }) {
  const legend = [
    { label: "Terminés", value: week.done, dot: "bg-success" },
    { label: "En cours", value: week.in_progress, dot: "bg-warning" },
    { label: "À faire", value: week.todo, dot: "bg-border" },
  ];
  return (
    <Card className="p-5 sm:p-6">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-center gap-4">
        <div>
          <h2 className="text-base font-bold tracking-tight">Ta semaine</h2>
          <ul className="mt-3 grid gap-2 text-sm">
            {legend.map((item) => (
              <li key={item.label} className="flex items-center gap-2">
                <span aria-hidden className={cn("size-2.5 rounded-full", item.dot)} />
                <span className="text-muted-foreground">{item.label}</span>
                <span className="ml-auto font-bold tabular-nums">{item.value}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex justify-center">
          {week.total === 0 ? (
            <div className="text-muted-foreground py-4 text-center text-sm">
              <Sparkles className="text-primary mx-auto mb-2 size-6" />
              Aucun rendu
              <br />
              cette semaine
            </div>
          ) : (
            <ProgressGauge done={week.done} inProgress={week.in_progress} total={week.total} />
          )}
        </div>
      </div>
    </Card>
  );
}

function NextUpCard({ summary }: { summary: DashboardSummary }) {
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
    <Card className="p-5 sm:p-6">
      <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
        Prochaine échéance
      </p>
      {next === null ? (
        <p className="text-muted-foreground mt-3 text-sm">Rien à l&apos;horizon pour le moment.</p>
      ) : (
        <div className="mt-3 flex items-center gap-3">
          <SubjectTile
            color={next.item.subject?.color}
            icon={next.kind === "assignment" ? ClipboardList : GraduationCap}
            className="size-12"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{next.item.title}</p>
            <p className="text-muted-foreground truncate text-xs">
              {formatRelative(next.kind === "assignment" ? next.item.due_at : next.item.exam_at)}
              {next.item.subject && ` · ${next.item.subject.name}`}
            </p>
          </div>
          {next.kind === "assignment" ? (
            <Button
              disabled={pending}
              onClick={() => setStatus(next.item, "done")}
              aria-label={`Terminer « ${next.item.title} »`}
            >
              C&apos;est fait
            </Button>
          ) : (
            <Button asChild variant="secondary">
              <Link href="/exams">Voir</Link>
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

function DashboardContent({ summary }: { summary: DashboardSummary }) {
  // Only ever rendered in the browser (after data loaded): reading the clock is safe.
  const [today] = useState(() => parisDayKey(new Date()));
  const [selectedDay, setSelectedDay] = useState(today);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));
  const [tab, setTab] = useState<Tab>("upcoming");
  const week = useWeekItems(weekStart);
  const assignmentDialogs = useAssignmentDialogs();
  const examDialogs = useExamDialogs();
  const { addSubject, addAssignment } = useQuickAdd();

  const busyDays = useMemo(
    () =>
      new Set([
        ...week.assignments.filter((a) => a.status !== "done").map((a) => parisDayKey(a.due_at)),
        ...week.exams.map((e) => parisDayKey(e.exam_at)),
      ]),
    [week.assignments, week.exams],
  );

  const dayItems = useMemo(() => {
    const items = [
      ...week.assignments
        .filter((a) => parisDayKey(a.due_at) === selectedDay)
        .map((a) => ({ kind: "assignment" as const, at: a.due_at, item: a })),
      ...week.exams
        .filter((e) => parisDayKey(e.exam_at) === selectedDay)
        .map((e) => ({ kind: "exam" as const, at: e.exam_at, item: e })),
    ];
    return items.sort((a, b) => a.at.localeCompare(b.at));
  }, [week.assignments, week.exams, selectedDay]);

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
    { value: "day", label: selectedDay === today ? "Aujourd'hui" : shortDay(selectedDay) },
    { value: "upcoming", label: "À venir" },
    { value: "overdue", label: "En retard", count: summary.counts.overdue },
    { value: "exams", label: "Examens", count: summary.counts.upcoming_exams },
  ] as const;

  return (
    <div className="grid grid-cols-1 gap-5">
      <Greeting summary={summary} />

      {summary.counts.subjects === 0 && (
        <div className="bg-ink text-ink-foreground flex flex-col gap-4 rounded-3xl p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white/12">
              <BookOpen className="size-5" />
            </span>
            <div>
              <p className="font-bold">Commence par ajouter ta première matière</p>
              <p className="text-ink-foreground/70 text-sm">
                Elle te permettra de classer tes devoirs et tes examens.
              </p>
            </div>
          </div>
          <Button onClick={addSubject} className="text-ink shrink-0 bg-white hover:bg-white/90">
            <Plus /> Ajouter une matière
          </Button>
        </div>
      )}

      <WeekStrip
        weekStart={weekStart}
        selected={selectedDay}
        today={today}
        busyDays={busyDays}
        onSelect={selectDay}
        onWeekChange={setWeekStart}
      />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="grid grid-cols-1 gap-5">
          <WeekProgressCard week={summary.week} />
          <NextUpCard summary={summary} />
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Au programme</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground -mr-2">
              <Link href={tab === "exams" ? "/exams" : "/assignments"}>
                Tout voir <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Segmented
              label="Afficher"
              value={tab}
              onChange={setTab}
              options={tabs}
              className="mb-3"
            />

            {tab === "day" &&
              (week.isPending ? (
                <Skeleton className="h-32" />
              ) : dayItems.length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title="Rien de prévu ce jour-là"
                  className="bg-secondary/50 border-0 py-8"
                />
              ) : (
                <ul className="grid grid-cols-1 gap-1">
                  {dayItems.map((entry) =>
                    entry.kind === "assignment" ? assignmentRow(entry.item) : examRow(entry.item),
                  )}
                </ul>
              ))}

            {tab === "upcoming" &&
              (summary.upcoming_assignments.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="Aucun devoir à venir"
                  description="Tout est à jour. Ajoute un devoir dès qu'un nouveau rendu est annoncé."
                  action={
                    <Button variant="secondary" onClick={addAssignment}>
                      <Plus /> Ajouter un devoir
                    </Button>
                  }
                  className="bg-secondary/50 border-0 py-8"
                />
              ) : (
                <ul className="grid grid-cols-1 gap-1">
                  {summary.upcoming_assignments.map(assignmentRow)}
                </ul>
              ))}

            {tab === "overdue" &&
              (summary.overdue_assignments.length === 0 ? (
                <EmptyState
                  icon={PartyPopper}
                  title="Aucun retard, bravo !"
                  className="bg-secondary/50 border-0 py-8"
                />
              ) : (
                <ul className="grid grid-cols-1 gap-1">
                  {summary.overdue_assignments.map(assignmentRow)}
                </ul>
              ))}

            {tab === "exams" &&
              (summary.upcoming_exams.length === 0 ? (
                <EmptyState
                  icon={GraduationCap}
                  title="Aucun examen enregistré"
                  description="Ajoute tes partiels pour les voir arriver."
                  className="bg-secondary/50 border-0 py-8"
                />
              ) : (
                <ul className="grid grid-cols-1 gap-1">{summary.upcoming_exams.map(examRow)}</ul>
              ))}
          </CardContent>
        </Card>
      </div>

      {assignmentDialogs.dialogs}
      {examDialogs.dialogs}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Chargement du tableau de bord" className="grid gap-5">
      <Skeleton className="h-16 w-64" />
      <Skeleton className="h-28 rounded-3xl" />
      <div className="grid gap-5 lg:grid-cols-[5fr_7fr]">
        <Skeleton className="h-64 rounded-3xl" />
        <Skeleton className="h-80 rounded-3xl" />
      </div>
    </div>
  );
}

export function DashboardView() {
  const dashboard = useDashboard();
  if (dashboard.isPending) return <DashboardSkeleton />;
  if (dashboard.isError) {
    return <ErrorState error={dashboard.error} onRetry={() => dashboard.refetch()} />;
  }
  return <DashboardContent summary={dashboard.data} />;
}
