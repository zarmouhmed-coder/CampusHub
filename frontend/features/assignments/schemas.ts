import { z } from "zod";

import type { Messages } from "@/lib/i18n/fr";
import type { Assignment, AssignmentInput } from "@/types/api";

export const makeAssignmentSchema = (t: Messages) =>
  z.object({
    title: z
      .string()
      .trim()
      .min(1, t.validation.assignmentTitleRequired)
      .max(200, t.validation.max(200)),
    description: z.string().trim().max(2000, t.validation.max(2000)),
    subject_id: z.string(),
    due_at: z.string().min(1, t.validation.assignmentDueRequired),
    priority: z.enum(["low", "normal", "high"]),
    status: z.enum(["todo", "in_progress", "done"]),
  });
export type AssignmentFormValues = z.infer<ReturnType<typeof makeAssignmentSchema>>;

/** Converters between the API's UTC instants and the form's local wall-clock values. */
type Zoned = { toInput: (iso: string) => string; fromInput: (value: string) => string };

export function toAssignmentFormValues(fmt: Zoned, assignment?: Assignment): AssignmentFormValues {
  return {
    title: assignment?.title ?? "",
    description: assignment?.description ?? "",
    subject_id: assignment?.subject?.id ?? "",
    due_at: assignment ? fmt.toInput(assignment.due_at) : "",
    priority: assignment?.priority ?? "normal",
    status: assignment?.status ?? "todo",
  };
}

export function toAssignmentInput(fmt: Zoned, values: AssignmentFormValues): AssignmentInput {
  return {
    title: values.title,
    description: values.description || null,
    subject_id: values.subject_id || null,
    due_at: fmt.fromInput(values.due_at),
    priority: values.priority,
    status: values.status,
  };
}
