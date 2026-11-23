import type { Metadata } from "next";

import { MyAttendanceView } from "@/features/attendance/attendance-views";

export const metadata: Metadata = { title: "Mes absences · My attendance" };

export default function Page() {
  return <MyAttendanceView />;
}
