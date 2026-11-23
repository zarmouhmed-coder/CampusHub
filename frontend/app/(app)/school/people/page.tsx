import type { Metadata } from "next";

import { PeopleView } from "@/features/school/people-view";

export const metadata: Metadata = { title: "Personnes · People" };

export default function Page() {
  return <PeopleView />;
}
