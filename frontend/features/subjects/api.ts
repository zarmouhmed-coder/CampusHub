"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Subject, SubjectInput } from "@/types/api";

export function useSubjects() {
  return useQuery({
    queryKey: queryKeys.subjects.all,
    queryFn: ({ signal }) => api.get<Subject[]>("/subjects", undefined, signal),
  });
}

/** Subjects are embedded in assignments and exams: refresh everything that shows them. */
function useInvalidateAll() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== queryKeys.me[0] });
}

export function useCreateSubject() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (input: SubjectInput) => api.post<Subject>("/subjects", input),
    onSuccess: invalidate,
  });
}

export function useUpdateSubject() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<SubjectInput> }) =>
      api.patch<Subject>(`/subjects/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useDeleteSubject() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/subjects/${id}`),
    onSuccess: invalidate,
  });
}
