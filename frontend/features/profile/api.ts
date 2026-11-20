"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Profile, ProfileUpdate, User } from "@/types/api";

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: ({ signal }) => api.get<Profile>("/profile/me", undefined, signal),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProfileUpdate) => api.patch<Profile>("/profile/me", input),
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.profile, profile);
      // The first name is also shown in the menu and on the dashboard.
      queryClient.setQueryData<User>(queryKeys.me, (user) =>
        user ? { ...user, first_name: profile.first_name } : user,
      );
    },
  });
}
