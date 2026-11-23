import type { Metadata } from "next";

import { MyFeesView } from "@/features/finance/finance-views";

export const metadata: Metadata = { title: "Mes frais · My fees" };

export default function Page() {
  return <MyFeesView />;
}
