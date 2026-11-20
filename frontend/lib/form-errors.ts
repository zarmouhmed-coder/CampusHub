import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

import { ApiError, errorMessage } from "@/lib/api-client";

/**
 * Report an API error on a react-hook-form form: field errors next to their field
 * when the API names the field, otherwise a global message (form "root").
 */
export function applyApiError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  knownFields: readonly Path<T>[],
): void {
  let placed = false;
  if (error instanceof ApiError) {
    for (const [field, message] of Object.entries(error.fieldErrors)) {
      if ((knownFields as readonly string[]).includes(field)) {
        setError(field as Path<T>, { type: "server", message });
        placed = true;
      }
    }
  }
  if (!placed) setError("root.server", { type: "server", message: errorMessage(error) });
}
