import type { Metadata } from "next";

import { PlatformAuditView } from "@/features/platform/platform-users";

export const metadata: Metadata = { title: "Journal · Activity log" };

export default function Page() {
  return <PlatformAuditView />;
}
