import { z } from "zod";

import { parisInputToIso, toParisInputValue } from "@/lib/dates";
import type { Assignment, AssignmentInput } from "@/types/api";

export const assignmentSchema = z.object({
  title: z.string().trim().min(1, "Donne un titre au devoir.").max(200, "200 caractères maximum."),
  description: z.string().trim().max(2000, "2000 caractères maximum."),
  subject_id: z.string(),
  due_at: z.string().min(1, "Choisis une date et une heure limite."),
  priority: z.enum(["low", "normal", "high"]),
  status: z.enum(["todo", "in_progress", "done"]),
});
export type AssignmentFormValues = z.infer<typeof assignmentSchema>;

export function toAssignmentFormValues(
  assignment?: Assignment,
  defaults: Partial<AssignmentFormValues> = {},
): AssignmentFormValues {
  return {
    title: assignment?.title ?? "",
    description: assignment?.description ?? "",
    subject_id: assignment?.subject?.id ?? defaults.subject_id ?? "",
    due_at: assignment ? toParisInputValue(assignment.due_at) : "",
    priority: assignment?.priority ?? "normal",
    status: assignment?.status ?? "todo",
  };
}

export function toAssignmentInput(values: AssignmentFormValues): AssignmentInput {
  return {
    title: values.title,
    description: values.description || null,
    subject_id: values.subject_id || null,
    due_at: parisInputToIso(values.due_at),
    priority: values.priority,
    status: values.status,
  };
}
