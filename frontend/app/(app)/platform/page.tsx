import type { Metadata } from "next";

import { PlatformView } from "@/features/platform/platform-view";

export const metadata: Metadata = { title: "Console" };

export default function Page() {
  return <PlatformView />;
}
