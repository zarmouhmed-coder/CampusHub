import type { Metadata } from "next";

import { ExamsView } from "@/features/exams/exams-view";

export const metadata: Metadata = { title: "Examens" };

export default function ExamsPage() {
  return <ExamsView />;
}
