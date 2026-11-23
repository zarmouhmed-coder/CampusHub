import type { Metadata } from "next";

import { SettingsView } from "@/features/school/settings-view";

export const metadata: Metadata = { title: "Paramètres · Settings" };

export default function Page() {
  return <SettingsView />;
}
