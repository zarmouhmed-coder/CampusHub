import { z } from "zod";

import type { Messages } from "@/lib/i18n/fr";
import type { Exam, ExamInput } from "@/types/api";

export const makeExamSchema = (t: Messages) =>
  z.object({
    title: z.string().trim().min(1, t.validation.examTitleRequired).max(200, t.validation.max(200)),
    subject_id: z.string(),
    exam_at: z.string().min(1, t.validation.examDateRequired),
    room: z.string().trim().max(100, t.validation.max(100)),
    description: z.string().trim().max(2000, t.validation.max(2000)),
  });
export type ExamFormValues = z.infer<ReturnType<typeof makeExamSchema>>;

type Zoned = { toInput: (iso: string) => string; fromInput: (value: string) => string };

export function toExamFormValues(fmt: Zoned, exam?: Exam): ExamFormValues {
  return {
    title: exam?.title ?? "",
    subject_id: exam?.subject?.id ?? "",
    exam_at: exam ? fmt.toInput(exam.exam_at) : "",
    room: exam?.room ?? "",
    description: exam?.description ?? "",
  };
}

export function toExamInput(fmt: Zoned, values: ExamFormValues): ExamInput {
  return {
    title: values.title,
    subject_id: values.subject_id || null,
    exam_at: fmt.fromInput(values.exam_at),
    room: values.room || null,
    description: values.description || null,
  };
}
