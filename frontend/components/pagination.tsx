"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export function Pagination({
  total,
  limit,
  offset,
  onChange,
}: {
  total: number;
  limit: number;
  offset: number;
  onChange: (offset: number) => void;
}) {
  const { t } = useI18n();
  if (total <= limit) return null;
  const page = Math.floor(offset / limit) + 1;
  const pages = Math.ceil(total / limit);
  return (
    <nav
      className="mt-4 flex items-center justify-between text-sm"
      aria-label={t.common.pagination}
    >
      <span className="text-muted-foreground">{t.common.pageOf(page, pages, total)}</span>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onChange(Math.max(0, offset - limit))}
        >
          <ChevronLeft /> {t.common.previous}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= pages}
          onClick={() => onChange(offset + limit)}
        >
          {t.common.next} <ChevronRight />
        </Button>
      </div>
    </nav>
  );
}
