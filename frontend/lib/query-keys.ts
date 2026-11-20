/**
 * Every server-state cache key in one place. Invalidating a prefix (e.g.
 * queryKeys.assignments.all) refreshes every list that depends on it.
 */
export const queryKeys = {
  me: ["me"] as const,
  profile: ["profile"] as const,
  subjects: { all: ["subjects"] as const },
  assignments: {
    all: ["assignments"] as const,
    list: (filters: object) => ["assignments", "list", filters] as const,
  },
  exams: {
    all: ["exams"] as const,
    list: (filters: object) => ["exams", "list", filters] as const,
  },
  dashboard: ["dashboard"] as const,
};
