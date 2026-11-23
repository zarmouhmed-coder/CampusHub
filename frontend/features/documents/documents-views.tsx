"use client";

import { Ban, FileBadge, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { RequireRole } from "@/components/campus/guard";
import { EmptyState, ListSkeleton, PageHeader } from "@/components/states";
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
import { Field } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/lib/i18n";
import { api, useApi, useApiMutation } from "@/lib/use-api";
import { useFormat } from "@/lib/use-format";
import type { IssuedDocument, Member } from "@/types/api";

function DocumentsTable({
  docs,
  students,
  onRevoke,
}: {
  docs: IssuedDocument[];
  students?: Member[];
  onRevoke?: (d: IssuedDocument) => void;
}) {
  const { t } = useI18n();
  const d = t.campus.documents;
  const fmt = useFormat();
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>{d.kind}</TableHead>
          {students && <TableHead>{t.campus.common.student}</TableHead>}
          <TableHead>{d.code}</TableHead>
          <TableHead>{d.issuedAt}</TableHead>
          <TableHead>{t.campus.common.status}</TableHead>
          <TableHead className="w-40" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {docs.map((doc) => (
          <TableRow key={doc.id} data-muted={doc.revoked_at !== null}>
            <TableCell className="font-medium">{d.kinds[doc.kind]}</TableCell>
            {students && (
              <TableCell>
                {students.find((s) => s.id === doc.student_id)?.first_name ??
                  doc.payload.student.first_name}
              </TableCell>
            )}
            <TableCell className="font-mono text-xs">{doc.code}</TableCell>
            <TableCell className="text-muted-foreground">{fmt.dateTime(doc.issued_at)}</TableCell>
            <TableCell>
              <Badge variant={doc.revoked_at ? "danger" : "success"}>
                {doc.revoked_at ? d.revoked : d.valid}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button asChild size="sm" variant="secondary">
                  <Link href={`/documents/${doc.id}`}>{t.campus.common.open}</Link>
                </Button>
                {onRevoke && !doc.revoked_at && (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={d.revoke}
                    onClick={() => onRevoke(doc)}
                  >
                    <Ban />
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function IssueDialog({
  open,
  onClose,
  students,
}: {
  open: boolean;
  onClose: () => void;
  students: Member[];
}) {
  const { t } = useI18n();
  const d = t.campus.documents;
  const router = useRouter();
  const [student, setStudent] = useState("");
  const [kind, setKind] = useState<IssuedDocument["kind"]>("transcript");
  const issue = useApiMutation(
    () => api.post<IssuedDocument>("/school/documents", { student_id: student, kind }),
    {
      invalidate: ["/school/documents"],
      success: t.campus.results.issued,
    },
  );
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{d.issue}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <Field id="doc-student" label={t.campus.common.student}>
            <NativeSelect
              id="doc-student"
              value={student}
              onChange={(e) => setStudent(e.target.value)}
            >
              <option value="">{t.campus.common.select}</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.first_name} — {s.student_number ?? s.email}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field id="doc-kind" label={d.kind}>
            <NativeSelect
              id="doc-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as IssuedDocument["kind"])}
            >
              <option value="transcript">{d.kinds.transcript}</option>
              <option value="enrollment_certificate">{d.kinds.enrollment_certificate}</option>
            </NativeSelect>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button
            disabled={!student || issue.isPending}
            onClick={async () => {
              const doc = await issue.mutateAsync(undefined);
              router.push(`/documents/${doc.id}`);
            }}
          >
            {d.issue}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdminDocuments() {
  const { t } = useI18n();
  const d = t.campus.documents;
  const docs = useApi<IssuedDocument[]>("/school/documents");
  const students = useApi<Member[]>("/school/members", { role: "student" });
  const [issuing, setIssuing] = useState(false);
  const [revoking, setRevoking] = useState<IssuedDocument | null>(null);
  const revoke = useApiMutation((id: string) => api.post(`/school/documents/${id}/revoke`), {
    invalidate: ["/school/documents"],
    success: d.revokedToast,
  });
  return (
    <>
      <PageHeader
        title={d.title}
        description={d.subtitle}
        actions={
          <Button onClick={() => setIssuing(true)}>
            <Plus /> {d.issue}
          </Button>
        }
      />
      {docs.isPending ? (
        <ListSkeleton />
      ) : !docs.data?.length ? (
        <EmptyState icon={FileBadge} title={d.empty} />
      ) : (
        <DocumentsTable docs={docs.data} students={students.data ?? []} onRevoke={setRevoking} />
      )}
      <IssueDialog
        open={issuing}
        onClose={() => setIssuing(false)}
        students={students.data ?? []}
      />
      <ConfirmDialog
        open={revoking !== null}
        onOpenChange={(o) => !o && setRevoking(null)}
        title={d.revokeTitle}
        description={d.revokeText}
        confirmLabel={d.revoke}
        onConfirm={() => revoke.mutateAsync(revoking!.id)}
      />
    </>
  );
}

export function AdminDocumentsView() {
  return (
    <RequireRole roles={["admin"]} module="documents">
      {() => <AdminDocuments />}
    </RequireRole>
  );
}

function MyDocuments() {
  const { t } = useI18n();
  const d = t.campus.documents;
  const docs = useApi<IssuedDocument[]>("/me/documents");
  return (
    <>
      <PageHeader title={d.myTitle} description={d.mySubtitle} />
      {docs.isPending ? (
        <ListSkeleton />
      ) : !docs.data?.length ? (
        <EmptyState icon={FileBadge} title={d.myEmpty} />
      ) : (
        <DocumentsTable docs={docs.data} />
      )}
    </>
  );
}

export function MyDocumentsView() {
  return (
    <RequireRole roles={["student"]} module="documents">
      {() => <MyDocuments />}
    </RequireRole>
  );
}
