"use client";

import {
  Banknote,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  GraduationCap,
  Mail,
  Users,
} from "lucide-react";
import Link from "next/link";

import { AuditTable } from "@/components/campus/audit-table";
import { RequireRole } from "@/components/campus/guard";
import { Stat, StatGrid } from "@/components/campus/stat";
import { ErrorState, ListSkeleton, PageHeader } from "@/components/states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import type { AcademicYear, AuditEntry, Institution, SchoolOverview } from "@/types/api";

function Overview({ institution }: { institution: Institution }) {
  const { t } = useI18n();
  const s = t.campus.school;
  const money = useMoney();
  const data = useApi<SchoolOverview>("/school/overview");
  const years = useApi<AcademicYear[]>("/school/academic-years");
  const audit = useApi<AuditEntry[]>("/school/audit", { limit: 8 });

  if (data.isError) return <ErrorState error={data.error} onRetry={() => data.refetch()} />;
  const o = data.data;
  const steps = o && [
    { label: s.setupSteps.year, done: (years.data?.length ?? 0) > 0, href: "/school/structure" },
    { label: s.setupSteps.program, done: o.cohorts > 0, href: "/school/structure" },
    { label: s.setupSteps.people, done: o.students > 0 && o.teachers > 0, href: "/school/people" },
    { label: s.setupSteps.courses, done: o.courses > 0, href: "/school/courses" },
  ];
  const finance = institution.modules.includes("finance");

  return (
    <>
      <PageHeader
        title={institution.name}
        description={s.subtitle}
        meta={t.campus.plans[institution.plan]}
      />
      {!o ? (
        <ListSkeleton rows={3} />
      ) : (
        <div className="grid gap-5">
          <StatGrid>
            <Stat
              label={t.campus.common.students}
              value={o.students}
              icon={GraduationCap}
              tone="gold"
            />
            <Stat label={t.campus.people.tabs.teacher} value={o.teachers} icon={Users} />
            <Stat label={t.campus.structure.tabs.cohorts} value={o.cohorts} icon={BookOpen} />
            <Stat label={s.sessionsToday} value={o.sessions_today} icon={CalendarDays} />
            <Stat
              label={s.attendanceRate}
              value={o.attendance_rate_30d === null ? "—" : `${o.attendance_rate_30d} %`}
              icon={ClipboardCheck}
              tone="success"
            />
            {finance ? (
              <Stat
                label={s.collected}
                value={money(o.collected)}
                hint={`${s.billed} : ${money(o.billed)}`}
                icon={Banknote}
              />
            ) : (
              <Stat label={s.pendingInvitations} value={o.pending_invitations} icon={Mail} />
            )}
          </StatGrid>
          <div className="grid items-start gap-5 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>{s.setupTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-1">
                  {steps?.map((step) => (
                    <li key={step.label}>
                      <Link
                        href={step.href}
                        className="hover:bg-surface flex items-center gap-3 rounded-lg px-2 py-2 text-sm"
                      >
                        {step.done ? (
                          <CheckCircle2 className="text-success size-5 shrink-0" />
                        ) : (
                          <Circle className="text-input size-5 shrink-0" />
                        )}
                        <span className={cn(step.done && "text-muted-foreground line-through")}>
                          {step.label}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{s.recentActivity}</CardTitle>
              </CardHeader>
              <CardContent>
                {audit.data ? <AuditTable entries={audit.data} /> : <ListSkeleton rows={3} />}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

export function SchoolOverviewView() {
  return (
    <RequireRole roles={["admin"]}>
      {({ institution }) => <Overview institution={institution} />}
    </RequireRole>
  );
}

function SchoolAudit() {
  const { t } = useI18n();
  const log = useApi<AuditEntry[]>("/school/audit", { limit: 200 });
  return (
    <>
      <PageHeader
        title={t.campus.platform.auditTitle}
        description={t.campus.platform.auditSubtitle}
      />
      {log.isPending ? <ListSkeleton /> : <AuditTable entries={log.data ?? []} />}
    </>
  );
}

export function SchoolAuditView() {
  return <RequireRole roles={["admin"]}>{() => <SchoolAudit />}</RequireRole>;
}
