"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api, errorMessage } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n";

type Query = Record<string, string | number | null | undefined>;

/** GET an API path; `null` disables the query. Cached under ["api", path, query]. */
export function useApi<T>(path: string | null, query?: Query) {
  return useQuery({
    queryKey: ["api", path, query ?? {}],
    queryFn: ({ signal }) => api.get<T>(path as string, query, signal),
    enabled: path !== null,
  });
}

/**
 * A mutation that refreshes every cached GET whose path starts with one of
 * `invalidate`, toasts `success` and reports errors in the user's language.
 */
export function useApiMutation<TVars, TResult = unknown>(
  fn: (vars: TVars) => Promise<TResult>,
  { invalidate = [], success }: { invalidate?: string[]; success?: string } = {},
) {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      if (success) toast.success(success);
      await queryClient.invalidateQueries({
        predicate: (q) =>
          q.queryKey[0] === "api" &&
          typeof q.queryKey[1] === "string" &&
          invalidate.some((prefix) => (q.queryKey[1] as string).startsWith(prefix)),
      });
    },
    onError: (error) => toast.error(errorMessage(error, t)),
  });
}

export { api };
