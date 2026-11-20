"use client";

import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarClock,
  CircleDashed,
  ClipboardList,
  Clock,
  GraduationCap,
  Plus,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { EmptyState, ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AssignmentItem } from "@/features/assignments/assignment-item";
import { useAssignmentDialogs } from "@/features/assignments/use-assignment-dialogs";
import { useCurrentUser } from "@/features/auth/api";
import { ExamItem } from "@/features/exams/exam-item";
import { useExamDialogs } from "@/features/exams/use-exam-dialogs";
import { SubjectFormDialog } from "@/features/subjects/subject-form-dialog";
import { formatLongDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

import { useDashboard } from "./api";

function StatTile({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: "default" | "danger";
}) {
  const danger = tone === "danger" && value > 0;
  return (
    <div
      className={cn(
        "bg-card rounded-xl border p-4 shadow-xs",
        danger && "border-destructive/25 bg-destructive/[0.03]",
      )}
    >
      <div className="text-muted-foreground flex items-center justify-between">
        <span className="text-sm">{label}</span>
        <Icon className={cn("size-4", danger && "text-destructive")} />
      </div>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold tracking-tight tabular-nums",
          danger && "text-destructive",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function SeeAll({ href }: { href: string }) {
  return (
    <Button asChild variant="ghost" size="sm" className="text-muted-foreground -mr-2">
      <Link href={href}>
        Tout voir <ArrowRight />
      </Link>
    </Button>
  );
}

function DashboardSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Chargement du tableau de bord"
      className="grid grid-cols-1 gap-6"
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[5.5rem] rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <Skeleton className="h-72 rounded-xl lg:col-span-3" />
        <Skeleton className="h-72 rounded-xl lg:col-span-2" />
      </div>
    </div>
  );
}

function Greeting() {
  const { data: user } = useCurrentUser();
  return (
    <div>
      <p className="text-muted-foreground text-sm first-letter:uppercase">
        {formatLongDate(new Date())}
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">
        {user ? `Bonjour ${user.first_name}` : "Bonjour"}
      </h1>
    </div>
  );
}

export function DashboardView() {
  const dashboard = useDashboard();
  const assignments = useAssignmentDialogs();
  const exams = useExamDialogs();
  const [subjectOpen, setSubjectOpen] = useState(false);

  const quickActions = (
    <div className="grid grid-cols-3 gap-2 sm:flex">
      <Button onClick={assignments.openCreate}>
        <Plus /> Devoir
      </Button>
      <Button variant="outline" onClick={exams.openCreate}>
        <Plus /> Examen
      </Button>
      <Button variant="outline" onClick={() => setSubjectOpen(true)}>
        <Plus /> Matière
      </Button>
    </div>
  );

  return (
    <>
      {dashboard.isPending ? (
        <>
          <div className="mb-6 h-14" />
          <DashboardSkeleton />
        </>
      ) : dashboard.isError ? (
        <ErrorState error={dashboard.error} onRetry={() => dashboard.refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <Greeting />
            {quickActions}
          </div>

          {dashboard.data.counts.subjects === 0 && (
            <div className="border-primary/20 bg-accent/60 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <BookOpen className="text-accent-foreground mt-0.5 size-5 shrink-0" />
                <div>
                  <p className="font-medium">Commence par ajouter ta première matière</p>
                  <p className="text-muted-foreground text-sm">
                    Elle te permettra de classer tes devoirs et tes examens.
                  </p>
                </div>
              </div>
              <Button onClick={() => setSubjectOpen(true)} className="shrink-0">
                <Plus /> Ajouter une matière
              </Button>
            </div>
          )}

          <section aria-label="Résumé" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="À faire" value={dashboard.data.counts.todo} icon={CircleDashed} />
            <StatTile label="En cours" value={dashboard.data.counts.in_progress} icon={Clock} />
            <StatTile
              label="En retard"
              value={dashboard.data.counts.overdue}
              icon={AlertTriangle}
              tone="danger"
            />
            <StatTile
              label="Pour cette semaine"
              value={dashboard.data.counts.due_this_week}
              icon={CalendarClock}
            />
          </section>

          {dashboard.data.overdue_assignments.length > 0 && (
            <Card className="border-destructive/25">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <AlertTriangle className="size-4" /> Devoirs en retard
                </CardTitle>
                <SeeAll href="/assignments" />
              </CardHeader>
              <CardContent>
                <ul className="grid grid-cols-1 gap-2">
                  {dashboard.data.overdue_assignments.map((a) => (
                    <AssignmentItem
                      key={a.id}
                      assignment={a}
                      onEdit={assignments.openEdit}
                      onDelete={assignments.askDelete}
                      compact
                    />
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Prochains devoirs</CardTitle>
                <SeeAll href="/assignments" />
              </CardHeader>
              <CardContent>
                {dashboard.data.upcoming_assignments.length === 0 ? (
                  <EmptyState
                    icon={ClipboardList}
                    title="Aucun devoir à venir"
                    description="Tout est à jour. Ajoute un devoir dès qu'un nouveau rendu est annoncé."
                    className="py-8"
                  />
                ) : (
                  <ul className="grid grid-cols-1 gap-2">
                    {dashboard.data.upcoming_assignments.map((a) => (
                      <AssignmentItem
                        key={a.id}
                        assignment={a}
                        onEdit={assignments.openEdit}
                        onDelete={assignments.askDelete}
                        compact
                      />
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Prochains examens</CardTitle>
                <SeeAll href="/exams" />
              </CardHeader>
              <CardContent>
                {dashboard.data.upcoming_exams.length === 0 ? (
                  <EmptyState
                    icon={GraduationCap}
                    title="Aucun examen enregistré"
                    description="Ajoute tes partiels pour les voir arriver."
                    className="py-8"
                  />
                ) : (
                  <ul className="grid grid-cols-1 gap-2">
                    {dashboard.data.upcoming_exams.map((e) => (
                      <ExamItem
                        key={e.id}
                        exam={e}
                        onEdit={exams.openEdit}
                        onDelete={exams.askDelete}
                      />
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {assignments.dialogs}
      {exams.dialogs}
      <SubjectFormDialog open={subjectOpen} onOpenChange={setSubjectOpen} />
    </>
  );
}
