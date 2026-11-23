import { Suspense } from "react";

import { AppShell } from "@/components/layout/app-shell";

/**
 * The shell reads the current URL (active menu item). On dynamic routes
 * (/teaching/[courseId], /documents/[id]) that is request-time data, which must
 * sit behind <Suspense> with Cache Components. Static routes still prerender fully.
 */
export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
