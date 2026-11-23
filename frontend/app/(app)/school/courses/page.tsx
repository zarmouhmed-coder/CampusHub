import type { Metadata } from "next";

import { CoursesView } from "@/features/school/courses-view";

export const metadata: Metadata = { title: "UE et cours · Units and courses" };

export default function Page() {
  return <CoursesView />;
}
