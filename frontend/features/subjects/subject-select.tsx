"use client";

import { NativeSelect } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";

import { useSubjects } from "./api";

/** <select> of the user's subjects; value "" means "no subject". */
export function SubjectSelect({
  emptyLabel,
  ...props
}: React.ComponentProps<typeof NativeSelect> & { emptyLabel?: string }) {
  const { t } = useI18n();
  const subjects = useSubjects();
  return (
    <NativeSelect disabled={subjects.isPending} {...props}>
      <option value="">
        {subjects.isPending ? `${t.common.loading}…` : (emptyLabel ?? t.common.noSubject)}
      </option>
      {subjects.data?.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </NativeSelect>
  );
}
