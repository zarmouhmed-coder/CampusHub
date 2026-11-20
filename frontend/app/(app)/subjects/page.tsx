import type { Metadata } from "next";

import { SubjectsView } from "@/features/subjects/subjects-view";

export const metadata: Metadata = { title: "Matières" };

export default function SubjectsPage() {
  return <SubjectsView />;
}
