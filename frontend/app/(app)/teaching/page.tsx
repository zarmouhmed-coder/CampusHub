import type { Metadata } from "next";

import { TeachingView } from "@/features/teaching/teaching-view";

export const metadata: Metadata = { title: "Mes cours · My courses" };

export default function Page() {
  return <TeachingView />;
}
