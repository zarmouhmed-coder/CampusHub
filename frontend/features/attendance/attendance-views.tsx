"use client";

import {
  CalendarCheck,
  ClipboardCheck,
  PartyPopper,
  ShieldCheck,
  Timer,
  XCircle,
} from "lucide-react";
import { useState } from "react";

import { RequireRole } from "@/components/campus/guard";
import { Stat } from "@/components/campus/stat";
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStructure } from "@/features/school/use-structure";
import { useI18n } from "@/lib/i18n";
import { api, useApi, useApiMutation } from "@/lib/use-api";
import { useFormat } from "@/lib/use-format";
import type { AttendanceRecord, AttendanceStatus, MyAttendance } from "@/types/api";

const BADGE = {
  present: "success",
  absent: "danger",
  late: "warning",
  excused: "neutral",
} as const;

function RecordsTable({
  records,
  showStudent,
  onJustify,
}: {
  records: AttendanceRecord[];
  showStudent?: boolean;
  onJustify?: (r: AttendanceRecord) => void;
}) {
  const { t } = useI18n();
  const fmt = useFormat();
  const st = t.campus.timetable.statuses;
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>{t.campus.common.date}</TableHead>
          {showStudent && <TableHead>{t.campus.common.student}</TableHead>}
          <TableHead>{t.campus.timetable.course}</TableHead>
          <TableHead>{t.campus.common.status}</TableHead>
          <TableHead>{t.campus.attendance.note}</TableHead>
          {onJustify && <TableHead className="w-28" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="whitespace-nowrap">{fmt.dateTime(r.starts_at)}</TableCell>
            {showStudent && <TableCell className="font-medium">{r.student.name}</TableCell>}
            <TableCell>{r.course.name}</TableCell>
            <TableCell>
              <Badge variant={BADGE[r.status]}>{st[r.status]}</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground max-w-[16rem] truncate">
              {r.note ?? "—"}
            </TableCell>
            {onJustify && (
              <TableCell className="text-right">
                {r.status !== "excused" && (
                  <Button size="sm" variant="secondary" onClick={() => onJustify(r)}>
                    <ShieldCheck /> {t.campus.attendance.justify}
                  </Button>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function MyAttendancePage() {
  const { t } = useI18n();
  const a = t.campus.attendance;
  const data = useApi<MyAttendance>("/me/attendance");
  return (
    <>
      <PageHeader title={a.myTitle} description={a.mySubtitle} />
      {data.isPending ? (
        <ListSkeleton />
      ) : data.isError ? (
        <ErrorState error={data.error} onRetry={() => data.refetch()} />
      ) : (
        <div className="grid gap-5">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Stat
              label={a.rate}
              value={data.data.rate === null ? "—" : `${data.data.rate} %`}
              icon={CalendarCheck}
              tone="success"
            />
            <Stat label={a.recorded} value={data.data.recorded} icon={ClipboardCheck} />
            <Stat label={a.absences} value={data.data.absent} icon={XCircle} tone="danger" />
            <Stat label={a.lates} value={data.data.late} icon={Timer} tone="gold" />
          </div>
          {data.data.records.length === 0 ? (
            <EmptyState icon={PartyPopper} title={a.noRecords} />
          ) : (
            <RecordsTable records={data.data.records} />
          )}
        </div>
      )}
    </>
  );
}

export function MyAttendanceView() {
  return (
    <RequireRole roles={["student"]} module="attendance">
      {() => <MyAttendancePage />}
    </RequireRole>
  );
}

function AdminAttendance() {
  const { t } = useI18n();
  const a = t.campus.attendance;
  const ref = useStructure();
  const [cohort, setCohort] = useState("");
  const [status, setStatus] = useState<AttendanceStatus | "">("");
  const [justifying, setJustifying] = useState<AttendanceRecord | null>(null);
  const [note, setNote] = useState("");
  const records = useApi<AttendanceRecord[]>("/school/attendance", {
    cohort_id: cohort || undefined,
    status: status || undefined,
  });
  const justify = useApiMutation(
    () =>
      api.patch(`/school/attendance/${justifying!.id}`, { status: "excused", note: note || null }),
    { invalidate: ["/school/attendance"], success: a.justified },
  );
  const st = t.campus.timetable.statuses;
  return (
    <>
      <PageHeader title={a.adminTitle} description={a.adminSubtitle} />
      <div className="mb-4 grid grid-cols-2 gap-2 sm:flex">
        <NativeSelect
          aria-label={t.campus.common.cohort}
          value={cohort}
          onChange={(e) => setCohort(e.target.value)}
          className="sm:w-56"
        >
          <option value="">{t.campus.common.all}</option>
          {ref.options(ref.cohorts.data).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label={t.campus.common.status}
          value={status}
          onChange={(e) => setStatus(e.target.value as AttendanceStatus | "")}
          className="sm:w-44"
        >
          <option value="">{t.campus.common.all}</option>
          {(["absent", "late", "excused"] as const).map((s) => (
            <option key={s} value={s}>
              {st[s]}
            </option>
          ))}
        </NativeSelect>
      </div>
      {records.isPending ? (
        <ListSkeleton />
      ) : !records.data?.length ? (
        <EmptyState icon={PartyPopper} title={t.campus.common.empty} />
      ) : (
        <RecordsTable
          records={records.data}
          showStudent
          onJustify={(r) => {
            setNote(r.note ?? "");
            setJustifying(r);
          }}
        />
      )}
      <Dialog open={justifying !== null} onOpenChange={(o) => !o && setJustifying(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {a.justify} — {justifying?.student.name}
            </DialogTitle>
          </DialogHeader>
          <Field id="justify-note" label={a.note} optional>
            <Input
              id="justify-note"
              maxLength={200}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setJustifying(null)}>
              {t.common.cancel}
            </Button>
            <Button
              disabled={justify.isPending}
              onClick={() => justify.mutate(undefined, { onSuccess: () => setJustifying(null) })}
            >
              {a.justify}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AdminAttendanceView() {
  return (
    <RequireRole roles={["admin"]} module="attendance">
      {() => <AdminAttendance />}
    </RequireRole>
  );
}
