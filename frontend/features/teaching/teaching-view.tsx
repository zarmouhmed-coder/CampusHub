"use client";

import { ArrowRight, NotebookPen, Users } from "lucide-react";
import Link from "next/link";

import { RequireRole } from "@/components/campus/guard";
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { useApi } from "@/lib/use-api";
import type { CourseDetail } from "@/types/api";

function CourseList() {
  const { t } = useI18n();
  const tt = t.campus.teaching;
  const courses = useApi<CourseDetail[]>("/teaching/courses");
  return (
    <>
      <PageHeader title={tt.title} description={tt.subtitle} />
      {courses.isPending ? (
        <ListSkeleton rows={3} className="sm:grid-cols-2 xl:grid-cols-3" />
      ) : courses.isError ? (
        <ErrorState error={courses.error} onRetry={() => courses.refetch()} />
      ) : courses.data.length === 0 ? (
        <EmptyState icon={NotebookPen} title={tt.noCourses} />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {courses.data.map((c) => (
            <li key={c.id}>
              <Link
                href={`/teaching/${c.id}`}
                className="soft group hover:shadow-glass flex h-full flex-col gap-3 rounded-2xl p-4 transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{c.name}</p>
                    <p className="text-muted-foreground truncate text-sm">{c.unit.name}</p>
                  </div>
                  <ArrowRight className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-1.5">
                  <Badge variant="accent">{c.cohort.name}</Badge>
                  <Badge>{c.period.name}</Badge>
                  <span className="text-muted-foreground ml-auto inline-flex items-center gap-1 text-xs">
                    <Users className="size-3.5" /> {tt.students(c.students)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function TeachingView() {
  return (
    <RequireRole roles={["teacher", "admin"]} module="grades">
      {() => <CourseList />}
    </RequireRole>
  );
}
