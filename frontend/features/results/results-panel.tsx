"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { PeriodResult, StudentResults, UnitResult } from "@/types/api";

function UnitRow({ unit, max }: { unit: UnitResult; max: number }) {
  const { t } = useI18n();
  const r = t.campus.results;
  const [open, setOpen] = useState(false);
  return (
    <li className="border-border/70 rounded-xl border">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="hover:bg-surface/60 flex w-full items-center gap-3 px-3 py-2.5 text-left"
      >
        <ChevronDown
          className={cn(
            "text-muted-foreground size-4 shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {unit.code && <span className="text-muted-foreground mr-1.5">{unit.code}</span>}
            {unit.name}
          </p>
          <p className="text-muted-foreground text-xs">{t.campus.courses.credits(unit.credits)}</p>
        </div>
        <span className="font-display text-lg font-semibold tabular-nums">
          {formatNumber(unit.average)}
          <span className="text-muted-foreground text-xs"> /{max}</span>
        </span>
        <Badge
          variant={
            unit.average === null
              ? "neutral"
              : unit.compensated
                ? "warning"
                : unit.validated
                  ? "success"
                  : "danger"
          }
        >
          {unit.average === null
            ? r.pending
            : unit.compensated
              ? r.compensated
              : unit.validated
                ? r.validated
                : r.notValidated}
        </Badge>
      </button>
      {open && (
        <div className="grid gap-2 border-t px-3 py-3">
          {unit.courses.map((c) => (
            <div key={c.id} className="bg-surface/70 rounded-lg px-3 py-2">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium">
                  {c.name}{" "}
                  <span className="text-muted-foreground text-xs">
                    ({r.coef} {c.coefficient})
                  </span>
                </span>
                <span className="font-semibold tabular-nums">{formatNumber(c.average)}</span>
              </div>
              {c.assessments.length > 0 && (
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {c.assessments.map((a, i) => (
                    <li key={i} className="bg-card shadow-soft rounded-md px-2 py-0.5 text-xs">
                      {a.title} :{" "}
                      <span
                        className={cn("font-semibold tabular-nums", a.absent && "text-destructive")}
                      >
                        {a.absent
                          ? r.absentShort
                          : a.score === null
                            ? "—"
                            : `${formatNumber(a.score)}/${a.max_score}`}
                      </span>
                      {a.weight !== 1 && (
                        <span className="text-muted-foreground"> ×{a.weight}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </li>
  );
}

function PeriodCard({ period, max }: { period: PeriodResult; max: number }) {
  const { t } = useI18n();
  const r = t.campus.results;
  return (
    <Card>
      <CardHeader className="flex-wrap items-end">
        <div>
          <p className="text-gold-foreground text-xs font-semibold tracking-wider uppercase">
            {period.academic_year} · {period.cohort}
          </p>
          <CardTitle className="font-display text-lg">{period.name}</CardTitle>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-display text-2xl leading-none font-semibold tabular-nums">
              {formatNumber(period.average)}
              <span className="text-muted-foreground text-sm"> /{max}</span>
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              {r.creditsOf(period.credits_earned, period.credits_total)}
            </p>
          </div>
          <Badge
            variant={period.average === null ? "neutral" : period.validated ? "success" : "danger"}
          >
            {period.average === null ? r.pending : period.validated ? r.validated : r.notValidated}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2">
          {period.units.map((u) => (
            <UnitRow key={u.id} unit={u} max={max} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/** A student's results by period: shared by the student space, the admin and transcripts. */
export function ResultsPanel({ results }: { results: StudentResults }) {
  const { t } = useI18n();
  if (results.periods.length === 0) {
    return (
      <p className="soft text-muted-foreground rounded-2xl px-4 py-8 text-center text-sm">
        {t.campus.results.noResults}
      </p>
    );
  }
  return (
    <div className="grid gap-4">
      <p className="text-muted-foreground text-xs">
        {t.campus.results.scale(results.grade_max, results.pass_mark)}
      </p>
      {results.periods.map((p) => (
        <PeriodCard key={`${p.id}-${p.cohort}`} period={p} max={results.grade_max} />
      ))}
    </div>
  );
}
