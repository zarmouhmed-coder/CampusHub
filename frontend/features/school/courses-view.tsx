"use client";

import { BookOpen } from "lucide-react";
import { useState } from "react";

import { RequireRole } from "@/components/campus/guard";
import { ResourceSection } from "@/components/campus/resource-section";
import { EmptyState, PageHeader } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import type { Course, Unit } from "@/types/api";

import { useStructure, useTeachers, useUnits } from "./use-structure";

function UnitCourses({
  unit,
  teachers,
}: {
  unit: Unit;
  teachers: { value: string; label: string }[];
}) {
  const { t } = useI18n();
  const c = t.campus.common;
  return (
    <ResourceSection<Course>
      title={`${unit.code ? `${unit.code} · ` : ""}${unit.name} — ${t.campus.courses.credits(unit.credits)}`}
      addLabel={t.campus.courses.addCourse}
      path="/school/courses"
      query={{ unit_id: unit.id }}
      invalidate={["/teaching"]}
      defaults={{ unit_id: unit.id, coefficient: "1" }}
      fields={[
        {
          name: "unit_id",
          label: t.campus.results.unit,
          type: "select",
          required: true,
          createOnly: true,
          options: [{ value: unit.id, label: unit.name }],
        },
        { name: "name", label: c.name, required: true },
        { name: "code", label: c.code },
        { name: "coefficient", label: c.coefficient, type: "number", step: "0.5", required: true },
        { name: "teacher_id", label: c.teacher, type: "select", options: teachers },
      ]}
      columns={[
        { label: c.name, render: (x) => <span className="font-medium">{x.name}</span> },
        { label: c.coefficient, render: (x) => x.coefficient, className: "w-28" },
        {
          label: c.teacher,
          render: (x) =>
            teachers.find((o) => o.value === x.teacher_id)?.label ?? (
              <Badge variant="warning">{t.campus.courses.unassigned}</Badge>
            ),
        },
      ]}
    />
  );
}

function Courses() {
  const { t } = useI18n();
  const c = t.campus.common;
  const ref = useStructure();
  const teachers = useTeachers();
  const [cohortId, setCohortId] = useState<string>("");
  const cohort = cohortId || ref.cohorts.data?.[0]?.id || "";
  const units = useUnits(cohort || null);
  const cohortYear = ref.cohorts.data?.find((x) => x.id === cohort)?.academic_year_id;
  const periodOptions = ref.options(
    ref.periods.data?.filter((p) => p.academic_year_id === cohortYear),
  );
  const teacherOptions = (teachers.data ?? []).map((m) => ({
    value: m.id,
    label: `${m.first_name} (${m.email})`,
  }));

  return (
    <>
      <PageHeader title={t.campus.courses.title} description={t.campus.courses.subtitle} />
      {ref.cohorts.data && ref.cohorts.data.length === 0 ? (
        <EmptyState icon={BookOpen} title={t.campus.courses.noCohort} />
      ) : (
        <div className="grid gap-5">
          <Field id="courses-cohort" label={c.cohort} className="max-w-sm">
            <NativeSelect
              id="courses-cohort"
              value={cohort}
              onChange={(e) => setCohortId(e.target.value)}
            >
              {ref.cohorts.data?.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} — {ref.name(ref.programs.data, x.program_id)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          {cohort && (
            <ResourceSection<Unit>
              key={cohort}
              title={t.campus.results.unit}
              addLabel={t.campus.structure.newUnit}
              path="/school/units"
              query={{ cohort_id: cohort }}
              defaults={{ cohort_id: cohort, credits: "0" }}
              emptyText={t.campus.courses.noUnits}
              fields={[
                {
                  name: "cohort_id",
                  label: c.cohort,
                  type: "select",
                  required: true,
                  createOnly: true,
                  options: ref.options(ref.cohorts.data?.filter((x) => x.id === cohort)),
                },
                {
                  name: "period_id",
                  label: c.period,
                  type: "select",
                  required: true,
                  options: periodOptions,
                },
                { name: "name", label: c.name, required: true },
                { name: "code", label: c.code },
                { name: "credits", label: c.credits, type: "number", step: "0.5", required: true },
              ]}
              columns={[
                { label: c.name, render: (u) => <span className="font-medium">{u.name}</span> },
                { label: c.code, render: (u) => u.code ?? "—" },
                { label: c.period, render: (u) => ref.name(ref.periods.data, u.period_id) },
                { label: c.credits, render: (u) => u.credits, className: "w-24" },
              ]}
            />
          )}
          {units.data?.map((unit) => (
            <UnitCourses key={unit.id} unit={unit} teachers={teacherOptions} />
          ))}
        </div>
      )}
    </>
  );
}

export function CoursesView() {
  return <RequireRole roles={["admin"]}>{() => <Courses />}</RequireRole>;
}
