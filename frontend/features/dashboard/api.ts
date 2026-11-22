"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import { addDays } from "@/lib/dates";
import { queryKeys } from "@/lib/query-keys";
import type { Assignment, DashboardSummary, Exam, Page } from "@/types/api";

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: ({ signal }) => api.get<DashboardSummary>("/dashboard/summary", undefined, signal),
    // Overdue / upcoming depend on the current time: refresh every minute.
    refetchInterval: 60_000,
  });
}

/** Every assignment and exam of a calendar week (Monday key), in the user's timezone. */
export function useWeekItems(weekStart: string, dayStart: (key: string) => string) {
  const range = { after: dayStart(weekStart), before: dayStart(addDays(weekStart, 7)) };
  const assignments = useQuery({
    queryKey: queryKeys.assignments.list({ week: range.after }),
    queryFn: ({ signal }) =>
      api.get<Page<Assignment>>(
        "/assignments",
        { due_after: range.after, due_before: range.before, limit: 100 },
        signal,
      ),
  });
  const exams = useQuery({
    queryKey: queryKeys.exams.list({ week: range.after }),
    queryFn: ({ signal }) => api.get<Page<Exam>>("/exams", { ...range, limit: 100 }, signal),
  });
  return {
    assignments: assignments.data?.items ?? [],
    exams: exams.data?.items ?? [],
    isPending: assignments.isPending || exams.isPending,
  };
}
