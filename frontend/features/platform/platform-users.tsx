"use client";

import { useState } from "react";

import { AuditTable } from "@/components/campus/audit-table";
import { RequireRole } from "@/components/campus/guard";
import { ListSkeleton, PageHeader } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/lib/i18n";
import { useApi } from "@/lib/use-api";
import type { AuditEntry, PlatformUser } from "@/types/api";

function Users() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const users = useApi<PlatformUser[]>("/platform/users", { q: q.trim() || undefined });
  return (
    <>
      <PageHeader title={t.campus.platform.users} description={t.campus.platform.usersSubtitle} />
      <Input
        className="mb-4 max-w-sm"
        placeholder={t.campus.common.search}
        aria-label={t.campus.common.search}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {users.isPending ? (
        <ListSkeleton />
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>{t.campus.common.email}</TableHead>
              <TableHead>{t.campus.common.firstName}</TableHead>
              <TableHead>{t.campus.platform.institutions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.data?.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">
                  {u.email}{" "}
                  {u.is_superadmin && (
                    <Badge variant="accent">{t.campus.platform.superadmin}</Badge>
                  )}
                </TableCell>
                <TableCell>{u.first_name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {u.institutions.join(", ") || t.campus.platform.personalAccount}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}

export function PlatformUsersView() {
  return <RequireRole roles="superadmin">{() => <Users />}</RequireRole>;
}

function Audit() {
  const { t } = useI18n();
  const log = useApi<AuditEntry[]>("/platform/audit");
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

export function PlatformAuditView() {
  return <RequireRole roles="superadmin">{() => <Audit />}</RequireRole>;
}
