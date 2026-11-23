"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/lib/i18n";
import { useFormat } from "@/lib/use-format";
import type { AuditEntry } from "@/types/api";

export function AuditTable({ entries }: { entries: AuditEntry[] }) {
  const { t } = useI18n();
  const fmt = useFormat();
  if (entries.length === 0) {
    return (
      <p className="bg-surface text-muted-foreground rounded-lg px-3 py-4 text-center text-sm">
        {t.campus.common.empty}
      </p>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>{t.campus.common.when}</TableHead>
          <TableHead>{t.campus.common.actor}</TableHead>
          <TableHead>{t.campus.common.action}</TableHead>
          <TableHead>{t.campus.common.target}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((e) => (
          <TableRow key={e.id}>
            <TableCell className="text-muted-foreground whitespace-nowrap">
              {fmt.dateTime(e.created_at)}
            </TableCell>
            <TableCell>{e.actor_email ?? t.campus.common.system}</TableCell>
            <TableCell>
              <code className="bg-surface rounded px-1.5 py-0.5 text-xs">{e.action}</code>
            </TableCell>
            <TableCell className="text-muted-foreground max-w-[20rem] truncate text-xs">
              {Object.entries(e.details)
                .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
                .join(" · ") ||
                e.target_type ||
                "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
