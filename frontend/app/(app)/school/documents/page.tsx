import type { Metadata } from "next";

import { AdminDocumentsView } from "@/features/documents/documents-views";

export const metadata: Metadata = { title: "Documents" };

export default function Page() {
  return <AdminDocumentsView />;
}
