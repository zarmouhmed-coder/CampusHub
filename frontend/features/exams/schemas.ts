import { z } from "zod";

import { parisInputToIso, toParisInputValue } from "@/lib/dates";
import type { Exam, ExamInput } from "@/types/api";

export const examSchema = z.object({
  title: z.string().trim().min(1, "Donne un titre à l'examen.").max(200, "200 caractères maximum."),
  subject_id: z.string(),
  exam_at: z.string().min(1, "Choisis la date et l'heure de l'examen."),
  room: z.string().trim().max(100, "100 caractères maximum."),
  description: z.string().trim().max(2000, "2000 caractères maximum."),
});
export type ExamFormValues = z.infer<typeof examSchema>;

export function toExamFormValues(exam?: Exam): ExamFormValues {
  return {
    title: exam?.title ?? "",
    subject_id: exam?.subject?.id ?? "",
    exam_at: exam ? toParisInputValue(exam.exam_at) : "",
    room: exam?.room ?? "",
    description: exam?.description ?? "",
  };
}

export function toExamInput(values: ExamFormValues): ExamInput {
  return {
    title: values.title,
    subject_id: values.subject_id || null,
    exam_at: parisInputToIso(values.exam_at),
    room: values.room || null,
    description: values.description || null,
  };
}
