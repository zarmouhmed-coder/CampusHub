import type { Metadata } from "next";

import { StructureView } from "@/features/school/structure-view";

export const metadata: Metadata = { title: "Structure" };

export default function Page() {
  return <StructureView />;
}
