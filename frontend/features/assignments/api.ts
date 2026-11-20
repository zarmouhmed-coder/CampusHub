"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Assignment, AssignmentInput, AssignmentStatus, Page, Priority } from "@/types/api";

export interface AssignmentFilters {
  status?: AssignmentStatus;
  priority?: Priority;
  subject_id?: string;
  order: "asc" | "desc";
  limit: number;
  offset: number;
}

export function useAssignments(filters: AssignmentFilters) {
  return useQuery({
    queryKey: queryKeys.assignments.list(filters),
    queryFn: ({ signal }) => api.get<Page<Assignment>>("/assignments", { ...filters }, signal),
    // Keep showing the current page while the next filter/page loads.
    placeholderData: keepPreviousData,
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
    ]);
}

export function useCreateAssignment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: AssignmentInput) => api.post<Assignment>("/assignments", input),
    onSuccess: invalidate,
  });
}

export function useUpdateAssignment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<AssignmentInput> }) =>
      api.patch<Assignment>(`/assignments/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useDeleteAssignment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/assignments/${id}`),
    onSuccess: invalidate,
  });
}
