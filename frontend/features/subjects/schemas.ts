import { z } from "zod";

import type { Subject, SubjectInput } from "@/types/api";

export const SUBJECT_COLORS = [
  { value: "#4f46e5", label: "Indigo" },
  { value: "#0284c7", label: "Bleu" },
  { value: "#0d9488", label: "Sarcelle" },
  { value: "#16a34a", label: "Vert" },
  { value: "#ca8a04", label: "Moutarde" },
  { value: "#ea580c", label: "Orange" },
  { value: "#dc2626", label: "Rouge" },
  { value: "#db2777", label: "Rose" },
  { value: "#9333ea", label: "Violet" },
  { value: "#475569", label: "Ardoise" },
] as const;

export const subjectSchema = z.object({
  name: z.string().trim().min(1, "Donne un nom à la matière.").max(100, "100 caractères maximum."),
  description: z.string().trim().max(2000, "2000 caractères maximum."),
  color: z.string(),
});
export type SubjectFormValues = z.infer<typeof subjectSchema>;

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
