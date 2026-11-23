import type { Metadata } from "next";

import { MyResultsView } from "@/features/results/results-views";

export const metadata: Metadata = { title: "Mes notes · My grades" };

export default function Page() {
  return <MyResultsView />;
}
