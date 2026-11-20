/**
 * Semi-circular gauge: done (green) then in progress (amber) over a grey track.
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
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  const donePct = pct(done);
  const progressPct = pct(inProgress);
  const arc = "M 14 86 A 72 72 0 0 1 158 86";
  // Small visual gap between the two coloured segments.
  const gap = donePct > 0 && progressPct > 0 ? 3 : 0;

  return (
    <div
      role="img"
      aria-label={`${done} devoir${done > 1 ? "s" : ""} terminé${done > 1 ? "s" : ""} sur ${total} cette semaine`}
      className="relative w-full max-w-[13rem]"
    >
      <svg viewBox="0 0 172 96" className="w-full overflow-visible">
        <path
          d={arc}
          pathLength={100}
          fill="none"
          strokeWidth={15}
          strokeLinecap="round"
          className="stroke-secondary"
        />
        {progressPct > 0 && (
          <path
            d={arc}
            pathLength={100}
            fill="none"
            strokeWidth={15}
            strokeLinecap="round"
            className="stroke-warning transition-[stroke-dasharray,stroke-dashoffset] duration-700"
            strokeDasharray={`${Math.max(progressPct - gap, 0.01)} 200`}
            strokeDashoffset={-(donePct + gap)}
          />
        )}
        {donePct > 0 && (
          <path
            d={arc}
            pathLength={100}
            fill="none"
            strokeWidth={15}
            strokeLinecap="round"
            className="stroke-success transition-[stroke-dasharray] duration-700"
            strokeDasharray={`${donePct} 200`}
          />
        )}
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <p className="text-[1.65rem] leading-none font-extrabold tracking-tight tabular-nums">
          {done}
          <span className="text-muted-foreground"> / {total}</span>
        </p>
        <p className="text-muted-foreground mt-1 text-xs font-medium">terminés</p>
      </div>
    </div>
  );
}
