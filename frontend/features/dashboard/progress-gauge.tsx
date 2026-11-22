"use client";

import { useI18n } from "@/lib/i18n";

/**
 * Semi-circular gauge: done (green) then in progress (amber) over a recessed track.
 * Pure SVG; `pathLength=100` lets each segment be expressed as a percentage.
 */
export function ProgressGauge({
  done,
  inProgress,
  total,
}: {
  done: number;
  inProgress: number;
  total: number;
}) {
  const { t } = useI18n();
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  const donePct = pct(done);
  const progressPct = pct(inProgress);
  const arc = "M 14 86 A 72 72 0 0 1 158 86";
  const gap = donePct > 0 && progressPct > 0 ? 3 : 0;
  const stroke = {
    fill: "none",
    strokeWidth: 13,
    strokeLinecap: "round" as const,
    pathLength: 100,
  };

  return (
    <div
      role="img"
      aria-label={t.dashboard.gaugeAria(done, total)}
      className="relative w-full max-w-[11.5rem]"
    >
      <svg viewBox="0 0 172 96" className="w-full overflow-visible">
        <path d={arc} {...stroke} className="stroke-secondary" />
        {progressPct > 0 && (
          <path
            d={arc}
            {...stroke}
            className="stroke-warning transition-[stroke-dasharray,stroke-dashoffset] duration-700"
            strokeDasharray={`${Math.max(progressPct - gap, 0.01)} 200`}
            strokeDashoffset={-(donePct + gap)}
          />
        )}
        {donePct > 0 && (
          <path
            d={arc}
            {...stroke}
            className="stroke-success transition-[stroke-dasharray] duration-700"
            strokeDasharray={`${donePct} 200`}
          />
        )}
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <p className="font-display text-[1.6rem] leading-none font-semibold tabular-nums">
          {done}
          <span className="text-muted-foreground"> / {total}</span>
        </p>
        <p className="text-muted-foreground mt-1 text-[0.7rem] font-medium">
          {t.dashboard.gaugeDone}
        </p>
      </div>
    </div>
  );
}
