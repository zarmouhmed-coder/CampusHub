import { z } from "zod";

import type { Messages } from "@/lib/i18n/fr";
import type { Subject, SubjectInput } from "@/types/api";

export const SUBJECT_COLORS = [
  { value: "#4f46e5", key: "indigo" },
  { value: "#0284c7", key: "blue" },
  { value: "#0d9488", key: "teal" },
  { value: "#16a34a", key: "green" },
  { value: "#ca8a04", key: "mustard" },
  { value: "#ea580c", key: "orange" },
  { value: "#dc2626", key: "red" },
  { value: "#db2777", key: "pink" },
  { value: "#9333ea", key: "violet" },
  { value: "#475569", key: "slate" },
] as const satisfies readonly { value: string; key: keyof Messages["subjects"]["colors"] }[];

export const makeSubjectSchema = (t: Messages) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, t.validation.subjectNameRequired)
      .max(100, t.validation.max(100)),
    description: z.string().trim().max(2000, t.validation.max(2000)),
    color: z.string(),
  });
export type SubjectFormValues = z.infer<ReturnType<typeof makeSubjectSchema>>;

export function toSubjectFormValues(subject?: Subject): SubjectFormValues {
  return {
    name: subject?.name ?? "",
    description: subject?.description ?? "",
    color: subject?.color ?? SUBJECT_COLORS[0].value,
  };
}

export function toSubjectInput(values: SubjectFormValues): SubjectInput {
  return {
    name: values.name,
    description: values.description || null,
    color: values.color || null,
  };
}
