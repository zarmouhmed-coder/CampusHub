import type { Metadata } from "next";

import { PlatformUsersView } from "@/features/platform/platform-users";

export const metadata: Metadata = { title: "Utilisateurs · Users" };

export default function Page() {
  return <PlatformUsersView />;
}
