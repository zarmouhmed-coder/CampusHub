import type { Metadata } from "next";

import { AdminFinanceView } from "@/features/finance/finance-views";

export const metadata: Metadata = { title: "Finances · Finance" };

export default function Page() {
  return <AdminFinanceView />;
}
