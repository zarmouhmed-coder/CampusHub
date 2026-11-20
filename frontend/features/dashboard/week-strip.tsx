"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { addDays, dayOfMonth, monthYear, shortDay, weekdayShort } from "@/lib/dates";
import { cn } from "@/lib/utils";

/** Seven days (Monday-Sunday); the selected day is an ink pill, busy days get a dot. */
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
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const isCurrentWeek = days.includes(today);

  return (
    <section aria-label="Semaine" className="bg-card shadow-card rounded-3xl p-3 sm:p-4">
      <div className="mb-2 flex items-center justify-between gap-2 pl-2">
        <p className="text-sm font-bold capitalize">{monthYear(addDays(weekStart, 3))}</p>
        <div className="flex items-center gap-1">
          {!isCurrentWeek && (
            <Button variant="ghost" size="sm" onClick={() => onSelect(today)}>
              Aujourd&apos;hui
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Semaine précédente"
            onClick={() => onWeekChange(addDays(weekStart, -7))}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Semaine suivante"
            onClick={() => onWeekChange(addDays(weekStart, 7))}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const isSelected = day === selected;
          const isToday = day === today;
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelect(day)}
              aria-pressed={isSelected}
              aria-label={`${shortDay(day)}${isToday ? ", aujourd'hui" : ""}${busyDays.has(day) ? ", échéances prévues" : ""}`}
              className={cn(
                "focus-visible:ring-ring mx-auto flex w-full max-w-[4.5rem] flex-col items-center gap-1 rounded-2xl py-2.5 transition-colors focus-visible:ring-[3px] focus-visible:outline-none",
                isSelected ? "bg-ink text-ink-foreground" : "hover:bg-secondary",
              )}
            >
              <span
                className={cn(
                  "text-[0.7rem] font-semibold capitalize",
                  isSelected ? "text-ink-foreground/70" : "text-muted-foreground",
                )}
              >
                {weekdayShort(day).replace(".", "")}
              </span>
              <span
                className={cn(
                  "text-base font-bold tabular-nums",
                  isToday && !isSelected && "text-primary",
                )}
              >
                {dayOfMonth(day)}
              </span>
              <span
                aria-hidden
                className={cn(
                  "size-1.5 rounded-full",
                  busyDays.has(day)
                    ? isSelected
                      ? "bg-ink-foreground"
                      : "bg-primary"
                    : "bg-transparent",
                )}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
