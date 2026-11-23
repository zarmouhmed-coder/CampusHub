"use client";

import { Lock, PauseCircle, PuzzleIcon } from "lucide-react";

import { EmptyState } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/features/auth/api";
import { useI18n } from "@/lib/i18n";
import type { Institution, ModuleName, Role, User } from "@/types/api";

/**
 * Hides a page from roles that cannot use it. This is only for a clean UX: the API
 * enforces the same rules on every request.
 */
export function RequireRole({
  roles,
  module,
  children,
}: {
  roles: Role[] | "superadmin";
  module?: ModuleName;
  children: (ctx: { user: User; institution: Institution }) => React.ReactNode;
}) {
  const { t } = useI18n();
  const { data: user, isPending } = useCurrentUser();
  if (isPending || !user) return <Skeleton className="h-64 rounded-2xl" />;

  if (roles === "superadmin") {
    if (!user.is_superadmin) {
      return (
        <EmptyState
          icon={Lock}
          title={t.campus.guard.noAccessTitle}
          description={t.campus.guard.noAccessText}
        />
      );
    }
    return <>{children({ user, institution: user.institution as Institution })}</>;
  }
  const institution = user.institution;
  if (institution && institution.status === "suspended") {
    return (
      <EmptyState
        icon={PauseCircle}
        title={t.campus.guard.suspendedTitle}
        description={t.campus.guard.suspendedText}
      />
    );
  }
  if (!institution || !user.role || !roles.includes(user.role)) {
    return (
      <EmptyState
        icon={Lock}
        title={t.campus.guard.noAccessTitle}
        description={t.campus.guard.noAccessText}
      />
    );
  }
  if (module && !institution.modules.includes(module)) {
    return (
      <EmptyState
        icon={PuzzleIcon}
        title={t.campus.guard.moduleOffTitle}
        description={t.campus.guard.moduleOffText}
      />
    );
  }
  return <>{children({ user, institution })}</>;
}
