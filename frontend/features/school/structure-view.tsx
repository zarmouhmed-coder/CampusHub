"use client";

import { useState } from "react";

import { RequireRole } from "@/components/campus/guard";
import { ResourceSection } from "@/components/campus/resource-section";
import { PageHeader } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Segmented } from "@/components/ui/segmented";
import { useDateOnly } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { AcademicYear, Cohort, Department, Period, Program, Room } from "@/types/api";

import { useStructure } from "./use-structure";

type Tab = "years" | "programs" | "cohorts" | "rooms";

function Structure() {
  const { t } = useI18n();
  const c = t.campus.common;
  const s = t.campus.structure;
  const date = useDateOnly();
  const ref = useStructure();
  const [tab, setTab] = useState<Tab>("years");
  const tabs = (Object.keys(s.tabs) as Tab[]).map((value) => ({ value, label: s.tabs[value] }));
  const invalidateAll = ["/school"];

  return (
    <>
      <PageHeader title={s.title} description={s.subtitle} />
      <Segmented label={s.title} value={tab} onChange={setTab} options={tabs} className="mb-5" />

      {tab === "years" && (
        <div className="grid gap-5 xl:grid-cols-2">
          <ResourceSection<AcademicYear>
            title={c.year}
            addLabel={s.newYear}
            path="/school/academic-years"
            invalidate={invalidateAll}
            fields={[
              { name: "name", label: c.name, required: true, hint: s.yearHint },
              { name: "starts_on", label: c.startsOn, type: "date", required: true },
              { name: "ends_on", label: c.endsOn, type: "date", required: true },
              { name: "is_current", label: s.isCurrent, type: "checkbox" },
            ]}
            columns={[
              { label: c.name, render: (y) => <span className="font-medium">{y.name}</span> },
              {
                label: `${c.startsOn} – ${c.endsOn}`,
                render: (y) => `${date(y.starts_on)} – ${date(y.ends_on)}`,
              },
              {
                label: c.status,
                render: (y) => (y.is_current ? <Badge variant="success">{c.current}</Badge> : ""),
              },
            ]}
          />
          <ResourceSection<Period>
            title={s.periods}
            addLabel={s.newPeriod}
            path="/school/periods"
            invalidate={invalidateAll}
            fields={[
              {
                name: "academic_year_id",
                label: c.year,
                type: "select",
                required: true,
                createOnly: true,
                options: ref.options(ref.years.data),
              },
              { name: "name", label: c.name, required: true, hint: s.periodHint },
              { name: "position", label: s.position, type: "number" },
              { name: "starts_on", label: c.startsOn, type: "date", required: true },
              { name: "ends_on", label: c.endsOn, type: "date", required: true },
            ]}
            defaults={{ position: "1" }}
            columns={[
              { label: c.name, render: (p) => <span className="font-medium">{p.name}</span> },
              { label: c.year, render: (p) => ref.name(ref.years.data, p.academic_year_id) },
              {
                label: `${c.startsOn} – ${c.endsOn}`,
                render: (p) => `${date(p.starts_on)} – ${date(p.ends_on)}`,
              },
            ]}
          />
        </div>
      )}

      {tab === "programs" && (
        <div className="grid gap-5 xl:grid-cols-2">
          <ResourceSection<Department>
            title={s.departments}
            addLabel={s.newDepartment}
            path="/school/departments"
            invalidate={invalidateAll}
            fields={[
              { name: "name", label: c.name, required: true },
              { name: "code", label: c.code },
            ]}
            columns={[
              { label: c.name, render: (d) => <span className="font-medium">{d.name}</span> },
              { label: c.code, render: (d) => d.code ?? "—" },
            ]}
          />
          <ResourceSection<Program>
            title={s.programs}
            addLabel={s.newProgram}
            path="/school/programs"
            invalidate={invalidateAll}
            fields={[
              { name: "name", label: c.name, required: true },
              { name: "code", label: c.code },
              { name: "level", label: c.level, hint: s.levelHint },
              {
                name: "department_id",
                label: c.department,
                type: "select",
                options: ref.options(ref.departments.data),
              },
            ]}
            columns={[
              { label: c.name, render: (p) => <span className="font-medium">{p.name}</span> },
              { label: c.level, render: (p) => p.level ?? "—" },
              {
                label: c.department,
                render: (p) => ref.name(ref.departments.data, p.department_id),
              },
            ]}
          />
        </div>
      )}

      {tab === "cohorts" && (
        <ResourceSection<Cohort>
          title={s.tabs.cohorts}
          addLabel={s.newCohort}
          path="/school/cohorts"
          invalidate={invalidateAll}
          fields={[
            { name: "name", label: c.name, required: true },
            {
              name: "program_id",
              label: c.program,
              type: "select",
              required: true,
              createOnly: true,
              options: ref.options(ref.programs.data),
            },
            {
              name: "academic_year_id",
              label: c.year,
              type: "select",
              required: true,
              createOnly: true,
              options: ref.options(ref.years.data),
            },
          ]}
          columns={[
            { label: c.name, render: (x) => <span className="font-medium">{x.name}</span> },
            { label: c.program, render: (x) => ref.name(ref.programs.data, x.program_id) },
            { label: c.year, render: (x) => ref.name(ref.years.data, x.academic_year_id) },
          ]}
        />
      )}

      {tab === "rooms" && (
        <ResourceSection<Room>
          title={s.tabs.rooms}
          addLabel={s.newRoom}
          path="/school/rooms"
          fields={[
            { name: "name", label: c.name, required: true },
            { name: "building", label: c.building },
            { name: "capacity", label: c.capacity, type: "number" },
          ]}
          columns={[
            { label: c.name, render: (r) => <span className="font-medium">{r.name}</span> },
            { label: c.building, render: (r) => r.building ?? "—" },
            { label: c.capacity, render: (r) => r.capacity ?? "—" },
          ]}
        />
      )}
    </>
  );
}

export function StructureView() {
  return <RequireRole roles={["admin"]}>{() => <Structure />}</RequireRole>;
}
