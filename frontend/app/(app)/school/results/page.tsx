import type { Metadata } from "next";

import { AdminResultsView } from "@/features/results/results-views";

export const metadata: Metadata = { title: "Résultats · Results" };

export default function Page() {
  return <AdminResultsView />;
}
