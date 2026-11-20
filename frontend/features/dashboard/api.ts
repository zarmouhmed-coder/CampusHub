"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { DashboardSummary } from "@/types/api";

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: ({ signal }) => api.get<DashboardSummary>("/dashboard/summary", undefined, signal),
    // Overdue / upcoming depend on the current time: refresh every minute.
    refetchInterval: 60_000,
  });
}
