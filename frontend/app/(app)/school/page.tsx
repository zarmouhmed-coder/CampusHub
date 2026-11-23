import type { Metadata } from "next";

import { SchoolOverviewView } from "@/features/school/overview-view";

export const metadata: Metadata = { title: "Établissement · Institution" };

export default function Page() {
  return <SchoolOverviewView />;
}
