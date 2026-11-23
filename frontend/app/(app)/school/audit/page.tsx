import type { Metadata } from "next";

import { SchoolAuditView } from "@/features/school/overview-view";

export const metadata: Metadata = { title: "Journal · Activity log" };

export default function Page() {
  return <SchoolAuditView />;
}
