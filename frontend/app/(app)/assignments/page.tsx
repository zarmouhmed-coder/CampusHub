import type { Metadata } from "next";

import { AssignmentsView } from "@/features/assignments/assignments-view";

export const metadata: Metadata = { title: "Devoirs" };

export default function AssignmentsPage() {
  return <AssignmentsView />;
}
