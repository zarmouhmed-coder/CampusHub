import type { Metadata } from "next";

import { AdminAttendanceView } from "@/features/attendance/attendance-views";

export const metadata: Metadata = { title: "Absences · Attendance" };

export default function Page() {
  return <AdminAttendanceView />;
}
