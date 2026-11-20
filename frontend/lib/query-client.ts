import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

import { ApiError } from "@/lib/api-client";

const PUBLIC_PATHS = ["/login", "/register"];

/** Session expired or revoked: go back to the login page. */
function handleUnauthorized(error: unknown) {
  if (
    error instanceof ApiError &&
    error.status === 401 &&
    typeof window !== "undefined" &&
    !PUBLIC_PATHS.includes(window.location.pathname)
  ) {
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
