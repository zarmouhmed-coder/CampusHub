import type { Metadata } from "next";

import { TimetableView } from "@/features/timetable/timetable-view";

export const metadata: Metadata = { title: "Emploi du temps · Timetable" };

export default function Page() {
  return <TimetableView />;
}
