"use client";

import { NativeSelect } from "@/components/ui/input";

import { useSubjects } from "./api";

/** <select> of the user's subjects; value "" means "no subject". */
export function SubjectSelect({
  emptyLabel = "Sans matière",
  ...props
}: React.ComponentProps<typeof NativeSelect> & { emptyLabel?: string }) {
  const subjects = useSubjects();
  return (
    <NativeSelect disabled={subjects.isPending} {...props}>
      <option value="">{subjects.isPending ? "Chargement…" : emptyLabel}</option>
      {subjects.data?.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </NativeSelect>
  );
}
