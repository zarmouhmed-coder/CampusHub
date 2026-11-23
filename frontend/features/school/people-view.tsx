"use client";

import { BarChart3, MoreHorizontal, Power, Upload, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { CopyLink } from "@/components/campus/copy-link";
import { RequireRole } from "@/components/campus/guard";
import { EmptyState, ListSkeleton, PageHeader } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, fieldA11y, FormError } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
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
import type { Invitation, InvitationResult, Member, Role } from "@/types/api";

import { useStructure } from "./use-structure";

type Tab = Role | "invitations";
const ROLES: Role[] = ["student", "teacher", "admin"];

type InviteValues = {
  email: string;
  first_name: string;
  role: Role;
  student_number: string;
  cohort_id: string;
};

function InviteDialog({ open, onClose, role }: { open: boolean; onClose: () => void; role: Role }) {
  const { t } = useI18n();
  const p = t.campus.people;
  const ref = useStructure();
  const [result, setResult] = useState<InvitationResult | null>(null);
  const form = useForm<InviteValues>({
    values: { email: "", first_name: "", role, student_number: "", cohort_id: "" },
  });
  const invite = useApiMutation(
    (v: InviteValues) =>
      api.post<InvitationResult>("/school/invitations", {
        email: v.email,
        role: v.role,
        first_name: v.first_name || null,
        student_number: v.student_number || null,
        cohort_id: v.cohort_id || null,
      }),
    { invalidate: ["/school/members", "/school/invitations"] },
  );
  const { errors, isSubmitting } = form.formState;
  const close = () => {
    setResult(null);
    onClose();
  };
  const onSubmit = form.handleSubmit(async (v) => {
    try {
      setResult(await invite.mutateAsync(v));
    } catch (error) {
      applyApiError(error, form.setError, ["email", "student_number", "cohort_id"], t, {
        already_member: "email",
        student_number_taken: "student_number",
      });
    }
  });
  const selectedRole = useWatch({ control: form.control, name: "role" });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{p.inviteTitle}</DialogTitle>
          <DialogDescription>{p.inviteText}</DialogDescription>
        </DialogHeader>
        {result ? (
          <div className="grid gap-4">
            <p className="font-medium">{result.status === "added" ? p.added : p.invited}</p>
            {result.invitation_url && <CopyLink url={result.invitation_url} label={p.linkLabel} />}
            <DialogFooter>
              <Button
                variant="secondary"
                onClick={() => {
                  setResult(null);
                  form.reset();
                }}
              >
                {p.invite}
              </Button>
              <Button onClick={close}>{t.common.close}</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="grid gap-4">
            <FormError message={errors.root?.server?.message} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="inv-email"
                label={t.campus.common.email}
                error={errors.email?.message}
                className="sm:col-span-2"
              >
                <Input
                  type="email"
                  {...fieldA11y("inv-email", errors.email?.message)}
                  {...form.register("email", { required: t.validation.emailRequired })}
                />
              </Field>
              <Field id="inv-first" label={t.campus.common.firstName} optional>
                <Input id="inv-first" {...form.register("first_name")} />
              </Field>
              <Field id="inv-role" label={t.campus.common.role}>
                <NativeSelect id="inv-role" {...form.register("role")}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {t.campus.roles[r]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              {selectedRole === "student" && (
                <>
                  <Field
                    id="inv-number"
                    label={p.studentNumber}
                    optional
                    error={errors.student_number?.message}
                  >
                    <Input
                      {...fieldA11y("inv-number", errors.student_number?.message)}
                      {...form.register("student_number")}
                    />
                  </Field>
                  <Field id="inv-cohort" label={t.campus.common.cohort} optional>
                    <NativeSelect id="inv-cohort" {...form.register("cohort_id")}>
                      <option value="">{t.campus.common.none}</option>
                      {ref.options(ref.cohorts.data).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                </>
              )}
            </div>
            <DialogFooter className="mt-2">
              <Button variant="secondary" onClick={close}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                <UserPlus /> {p.invite}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

/** "email,prénom,rôle,matricule" per line; separators , ; or tab; header line tolerated. */
function parseCsv(text: string) {
  const rows: {
    email: string;
    first_name: string | null;
    role: Role;
    student_number: string | null;
  }[] = [];
  let invalid = 0;
  for (const line of text.split(/\r?\n/)) {
    const cells = line.split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, ""));
    if (!cells[0] || /^e-?mail$/i.test(cells[0])) continue;
    if (!EMAIL.test(cells[0])) {
      invalid++;
      continue;
    }
    const role = (ROLES as string[]).includes(cells[2]?.toLowerCase() ?? "")
      ? (cells[2].toLowerCase() as Role)
      : "student";
    rows.push({
      email: cells[0].toLowerCase(),
      first_name: cells[1] || null,
      role,
      student_number: cells[3] || null,
    });
  }
  return { rows, invalid };
}

function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const p = t.campus.people;
  const ref = useStructure();
  const [text, setText] = useState("");
  const [cohort, setCohort] = useState("");
  const [results, setResults] = useState<InvitationResult[] | null>(null);
  const parsed = useMemo(() => parseCsv(text), [text]);
  const run = useApiMutation(
    () =>
      api.post<InvitationResult[]>("/school/invitations/import", {
        rows: parsed.rows.map((r) => ({
          ...r,
          cohort_id: r.role === "student" && cohort ? cohort : null,
        })),
      }),
    { invalidate: ["/school/members", "/school/invitations"], success: p.importDone },
  );
  const close = () => {
    setText("");
    setResults(null);
    onClose();
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{p.importTitle}</DialogTitle>
          <DialogDescription>{p.importText}</DialogDescription>
        </DialogHeader>
        {results ? (
          <div className="grid max-h-[50dvh] gap-2 overflow-y-auto">
            {results.map((r) => (
              <div
                key={r.email}
                className="bg-surface flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
              >
                <span className="min-w-0 flex-1 truncate">{r.email}</span>
                <Badge variant={r.status === "error" ? "danger" : "success"}>
                  {p.rowStatus[r.status]}
                </Badge>
                {r.error && (
                  <span className="text-destructive text-xs">
                    {t.errors[r.error as keyof typeof t.errors] ?? r.error}
                  </span>
                )}
              </div>
            ))}
            <DialogFooter>
              <Button onClick={close}>{t.common.close}</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="grid gap-4">
            <label className="soft-inset text-muted-foreground hover:text-foreground flex cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm">
              <Upload className="size-4" /> {p.file}
              <input
                type="file"
                accept=".csv,text/csv,text/plain"
                className="sr-only"
                onChange={async (e) => setText((await e.target.files?.[0]?.text()) ?? "")}
              />
            </label>
            <Textarea
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"email,prénom,rôle,matricule\nawa.diop@univ.sn,Awa,student,2026-001"}
              className="font-mono text-xs"
              aria-label={p.importTitle}
            />
            {parsed.invalid > 0 && (
              <p className="text-warning-foreground text-sm">{p.invalidRows(parsed.invalid)}</p>
            )}
            <Field id="imp-cohort" label={p.importCohort} optional>
              <NativeSelect
                id="imp-cohort"
                value={cohort}
                onChange={(e) => setCohort(e.target.value)}
              >
                <option value="">{t.campus.common.none}</option>
                {ref.options(ref.cohorts.data).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <DialogFooter>
              <Button variant="secondary" onClick={close}>
                {t.common.cancel}
              </Button>
              <Button
                disabled={parsed.rows.length === 0 || run.isPending}
                onClick={async () => setResults(await run.mutateAsync(undefined))}
              >
                {p.importRun(parsed.rows.length)}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function People() {
  const { t } = useI18n();
  const p = t.campus.people;
  const date = useDateOnly();
  const ref = useStructure();
  const [tab, setTab] = useState<Tab>("student");
  const [q, setQ] = useState("");
  const [inviting, setInviting] = useState(false);
  const [importing, setImporting] = useState(false);
  const members = useApi<Member[]>(tab === "invitations" ? null : "/school/members", {
    role: tab,
    q: q.trim() || undefined,
  });
  const invitations = useApi<Invitation[]>(tab === "invitations" ? "/school/invitations" : null);
  const inv = ["/school/members", "/school/overview"];
  const update = useApiMutation(
    ({ id, body }: { id: string; body: object }) => api.patch(`/school/members/${id}`, body),
    {
      invalidate: inv,
      success: t.campus.common.saved,
    },
  );
  const enroll = useApiMutation(
    ({ id, cohort }: { id: string; cohort: string }) =>
      api.post(`/school/members/${id}/enrollments`, { cohort_id: cohort }),
    {
      invalidate: inv,
      success: p.enrolled,
    },
  );
  const unenroll = useApiMutation(
    ({ id, cohort }: { id: string; cohort: string }) =>
      api.delete(`/school/members/${id}/enrollments/${cohort}`),
    {
      invalidate: inv,
    },
  );
  const revoke = useApiMutation((id: string) => api.delete(`/school/invitations/${id}`), {
    invalidate: ["/school/invitations"],
    success: p.revoked,
  });
  const tabs = (Object.keys(p.tabs) as Tab[]).map((value) => ({ value, label: p.tabs[value] }));

  return (
    <>
      <PageHeader
        title={p.title}
        description={p.subtitle}
        actions={
          <>
            <Button variant="secondary" onClick={() => setImporting(true)}>
              <Upload /> {p.import}
            </Button>
            <Button onClick={() => setInviting(true)}>
              <UserPlus /> {p.invite}
            </Button>
          </>
        }
      />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Segmented label={p.title} value={tab} onChange={setTab} options={tabs} />
        {tab !== "invitations" && (
          <Input
            className="sm:w-64"
            placeholder={t.campus.common.search}
            aria-label={t.campus.common.search}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        )}
      </div>

      {tab === "invitations" ? (
        invitations.isPending ? (
          <ListSkeleton />
        ) : !invitations.data?.length ? (
          <EmptyState icon={UserPlus} title={t.campus.common.empty} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t.campus.common.email}</TableHead>
                <TableHead>{t.campus.common.role}</TableHead>
                <TableHead>{p.expires}</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.data.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.email}</TableCell>
                  <TableCell>{t.campus.roles[i.role]}</TableCell>
                  <TableCell className="text-muted-foreground">{date(i.expires_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => revoke.mutate(i.id)}>
                      {p.revoke}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      ) : members.isPending ? (
        <ListSkeleton />
      ) : !members.data?.length ? (
        <EmptyState
          icon={UserPlus}
          title={p.noMembers}
          action={
            <Button onClick={() => setInviting(true)}>
              <UserPlus /> {p.invite}
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>{t.campus.common.firstName}</TableHead>
              <TableHead>{t.campus.common.email}</TableHead>
              {tab === "student" && <TableHead>{p.studentNumber}</TableHead>}
              {tab === "student" && <TableHead>{p.cohorts}</TableHead>}
              <TableHead>{t.campus.common.status}</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.data.map((m) => (
              <TableRow key={m.id} data-muted={m.status === "disabled"}>
                <TableCell className="font-medium">{m.first_name}</TableCell>
                <TableCell className="text-muted-foreground">{m.email}</TableCell>
                {tab === "student" && (
                  <TableCell className="tabular-nums">{m.student_number ?? "—"}</TableCell>
                )}
                {tab === "student" && (
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {m.cohort_ids.map((c) => (
                        <Badge key={c} variant="accent" className="pr-1">
                          {ref.name(ref.cohorts.data, c)}
                          <button
                            type="button"
                            aria-label={`${t.common.delete} ${ref.name(ref.cohorts.data, c)}`}
                            className="hover:bg-primary/15 rounded-full p-0.5"
                            onClick={() => unenroll.mutate({ id: m.id, cohort: c })}
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                )}
                <TableCell>
                  <Badge variant={m.status === "active" ? "success" : "neutral"}>
                    {m.status === "active" ? t.campus.common.active : t.campus.common.disabled}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t.common.actionsFor(m.email)}
                      >
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-60">
                      {m.role === "student" && (
                        <>
                          <DropdownMenuItem asChild>
                            <Link href={`/school/results?student=${m.id}`}>
                              <BarChart3 /> {p.viewResults}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuLabel>{p.enroll}</DropdownMenuLabel>
                          {ref.cohorts.data
                            ?.filter((c) => !m.cohort_ids.includes(c.id))
                            .map((c) => (
                              <DropdownMenuItem
                                key={c.id}
                                onSelect={() => enroll.mutate({ id: m.id, cohort: c.id })}
                              >
                                {c.name}
                              </DropdownMenuItem>
                            ))}
                          <DropdownMenuSeparator />
                        </>
                      )}
                      {ROLES.filter((r) => r !== m.role).map((r) => (
                        <DropdownMenuItem
                          key={r}
                          onSelect={() => update.mutate({ id: m.id, body: { role: r } })}
                        >
                          {p.makeRole(t.campus.roles[r])}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant={m.status === "active" ? "destructive" : "default"}
                        onSelect={() =>
                          update.mutate({
                            id: m.id,
                            body: { status: m.status === "active" ? "disabled" : "active" },
                          })
                        }
                      >
                        <Power />{" "}
                        {m.status === "active" ? t.campus.common.disable : t.campus.common.enable}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <InviteDialog
        open={inviting}
        onClose={() => setInviting(false)}
        role={tab === "invitations" ? "student" : tab}
      />
      <ImportDialog open={importing} onClose={() => setImporting(false)} />
    </>
  );
}

export function PeopleView() {
  return <RequireRole roles={["admin"]}>{() => <People />}</RequireRole>;
}
