import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

import { ApiError } from "@/lib/api-client";

/** Same list as proxy.ts: only these pages require a session. */
const PRIVATE_PREFIXES = [
  "/dashboard",
  "/subjects",
  "/assignments",
  "/exams",
  "/profile",
  "/platform",
  "/school",
  "/teaching",
  "/timetable",
  "/results",
  "/attendance",
  "/fees",
  "/documents",
  "/announcements",
];

/**
 * Session expired or revoked while on a private page: back to the login page.
 * Public pages (login, document verification, invitations…) may legitimately get
 * a 401 from /auth/me and must stay where they are.
 */
function handleUnauthorized(error: unknown) {
  if (!(error instanceof ApiError) || error.status !== 401 || typeof window === "undefined") return;
  const path = window.location.pathname;
  if (PRIVATE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    // Deliberate full page load: it also wipes every piece of in-memory state.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login?expired=1");
  }
}

export function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({ onError: handleUnauthorized }),
    mutationCache: new MutationCache({ onError: handleUnauthorized }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Do not retry client errors (401, 404, 422...): retrying cannot fix them.
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status >= 400 && error.status < 500) &&
          failureCount < 2,
        refetchOnWindowFocus: true,
      },
    },
  });
}
