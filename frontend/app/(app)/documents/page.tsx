import type { Metadata } from "next";

import { MyDocumentsView } from "@/features/documents/documents-views";

export const metadata: Metadata = { title: "Mes documents · My documents" };

export default function Page() {
  return <MyDocumentsView />;
}
