"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { addDays, dayOfMonth } from "@/lib/dates";
import { useI18n } from "@/lib/i18n";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";

/** Seven days (Monday-Sunday); the selected day is raised, busy days carry a dot. */
export function WeekStrip({
  weekStart,
  selected,
  today,
  busyDays,
  onSelect,
  onWeekChange,
}: {
  weekStart: string;
  selected: string;
  today: string;
  /** Day keys holding at least one open assignment or exam. */
  busyDays: ReadonlySet<string>;
  onSelect: (day: string) => void;
  onWeekChange: (weekStart: string) => void;
}) {
  const { t } = useI18n();
  const fmt = useFormat();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const isCurrentWeek = days.includes(today);

  return (
    <section aria-label={t.dashboard.week} className="soft rounded-2xl p-3">
      <div className="mb-2 flex items-center justify-between gap-2 pl-2">
        <p className="font-display text-[0.95rem] font-semibold capitalize">
          {fmt.monthYear(addDays(weekStart, 3))}
        </p>
        <div className="flex items-center gap-0.5">
          {!isCurrentWeek && (
            <Button variant="ghost" size="sm" onClick={() => onSelect(today)}>
              {t.common.today}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t.dashboard.previousWeek}
            onClick={() => onWeekChange(addDays(weekStart, -7))}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t.dashboard.nextWeek}
            onClick={() => onWeekChange(addDays(weekStart, 7))}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
      <div className="soft-inset grid grid-cols-7 gap-1 rounded-xl p-1">
        {days.map((day) => {
          const isSelected = day === selected;
          const isToday = day === today;
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelect(day)}
              aria-pressed={isSelected}
              aria-label={`${fmt.shortDay(day)}${isToday ? `, ${t.dashboard.todaySuffix}` : ""}${busyDays.has(day) ? `, ${t.dashboard.busyDay}` : ""}`}
              className={cn(
                "focus-visible:ring-ring flex flex-col items-center gap-0.5 rounded-lg py-2 transition-all duration-200 focus-visible:ring-[3px] focus-visible:outline-none",
                isSelected ? "bg-card shadow-soft" : "hover:bg-card/50",
              )}
            >
              <span className="text-muted-foreground text-[0.68rem] font-medium capitalize">
                {fmt.weekday(day).replace(".", "")}
              </span>
              <span
                className={cn(
                  "grid size-7 place-items-center rounded-full text-sm font-semibold tabular-nums",
                  isToday && "bg-primary text-primary-foreground",
                )}
              >
                {dayOfMonth(day)}
              </span>
              <span
                aria-hidden
                className={cn(
                  "size-1 rounded-full",
                  busyDays.has(day) ? "bg-gold" : "bg-transparent",
                )}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
