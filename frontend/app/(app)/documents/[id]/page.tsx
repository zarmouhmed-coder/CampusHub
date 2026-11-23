import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { DocumentPrintView } from "@/features/documents/document-print";

export const metadata: Metadata = { title: "Document" };

async function WithParams({ params }: Pick<PageProps<"/documents/[id]">, "params">) {
  const { id } = await params;
  return <DocumentPrintView documentId={id} />;
}

export default function Page({ params }: PageProps<"/documents/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <WithParams params={params} />
    </Suspense>
  );
}
