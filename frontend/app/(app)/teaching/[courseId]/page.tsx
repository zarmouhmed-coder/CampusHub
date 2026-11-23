import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { CourseView } from "@/features/teaching/course-view";

export const metadata: Metadata = { title: "Cours · Course" };

async function WithParams({ params }: Pick<PageProps<"/teaching/[courseId]">, "params">) {
  const { courseId } = await params;
  return <CourseView courseId={courseId} />;
}

export default function Page({ params }: PageProps<"/teaching/[courseId]">) {
  return (
    <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
      <WithParams params={params} />
    </Suspense>
  );
}
