"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Exam, ExamInput, Page } from "@/types/api";

export interface ExamFilters {
  when: "upcoming" | "past" | "all";
  subject_id?: string;
  limit: number;
  offset: number;
}

export function useExams(filters: ExamFilters) {
  return useQuery({
    queryKey: queryKeys.exams.list(filters),
    queryFn: ({ signal }) => api.get<Page<Exam>>("/exams", { ...filters }, signal),
    placeholderData: keepPreviousData,
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.exams.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
    ]);
}

export function useCreateExam() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: ExamInput) => api.post<Exam>("/exams", input),
    onSuccess: invalidate,
  });
}

export function useUpdateExam() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ExamInput> }) =>
      api.patch<Exam>(`/exams/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useDeleteExam() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/exams/${id}`),
    onSuccess: invalidate,
  });
}
