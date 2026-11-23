"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { homeFor } from "@/components/layout/navigation";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { browserTimeZone } from "@/lib/dates";
import type { Locale } from "@/lib/i18n";
import type { User } from "@/types/api";

import type { LoginValues, RegisterValues } from "./schemas";

export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: ({ signal }) => api.get<User>("/auth/me", undefined, signal),
    staleTime: 5 * 60_000,
  });
}

function useAuthSuccess() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return (user: User) => {
    // Start from a clean cache: nothing from a previous account may leak.
    queryClient.clear();
    queryClient.setQueryData(queryKeys.me, user);
    router.replace(homeFor(user));
  };
}

export function useLogin() {
  const onSuccess = useAuthSuccess();
  return useMutation({
    mutationFn: (values: LoginValues) => api.post<User>("/auth/login", values),
    onSuccess,
  });
}

export function useRegister() {
  const onSuccess = useAuthSuccess();
  return useMutation({
    // The browser's language and timezone become the profile defaults.
    mutationFn: (values: RegisterValues & { locale: Locale }) =>
      api.post<User>("/auth/register", { ...values, timezone: browserTimeZone() }),
    onSuccess,
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: () => api.post<void>("/auth/logout"),
    onSettled: () => {
      // Full page load rather than a client-side navigation: every cached query and
      // piece of in-memory state of this account is discarded at once.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/login");
    },
  });
}

/** Switch the active institution (people who belong to several). */
export function useSwitchInstitution() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (institutionId: string) =>
      api.post<User>("/auth/institution", { institution_id: institutionId }),
    onSuccess: (user) => {
      queryClient.clear();
      queryClient.setQueryData(queryKeys.me, user);
      router.replace(homeFor(user));
    },
  });
}
