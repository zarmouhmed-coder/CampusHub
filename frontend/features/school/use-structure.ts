"use client";

import { useApi } from "@/lib/use-api";
import type {
  AcademicYear,
  Cohort,
  Course,
  Department,
  Member,
  Period,
  Program,
  Room,
  Unit,
} from "@/types/api";

/** Reference lists of the institution, used to fill selects and resolve names. */
export function useStructure() {
  const years = useApi<AcademicYear[]>("/school/academic-years");
  const periods = useApi<Period[]>("/school/periods");
  const departments = useApi<Department[]>("/school/departments");
  const programs = useApi<Program[]>("/school/programs");
  const cohorts = useApi<Cohort[]>("/school/cohorts");
  const rooms = useApi<Room[]>("/school/rooms");
  const name = <T extends { id: string; name: string }>(list: T[] | undefined, id: string | null) =>
    list?.find((x) => x.id === id)?.name ?? "—";
  const options = <T extends { id: string; name: string }>(list: T[] | undefined) =>
    (list ?? []).map((x) => ({ value: x.id, label: x.name }));
  return { years, periods, departments, programs, cohorts, rooms, name, options };
}

export function useTeachers() {
  return useApi<Member[]>("/school/members", { role: "teacher" });
}

export function useUnits(cohortId: string | null) {
  return useApi<Unit[]>(cohortId ? "/school/units" : null, { cohort_id: cohortId ?? undefined });
}

export function useCourses(unitId: string | null) {
  return useApi<Course[]>(unitId ? "/school/courses" : null, { unit_id: unitId ?? undefined });
}
