import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

import { ApiError, errorMessage } from "@/lib/api-client";
import type { Messages } from "@/lib/i18n/fr";

/**
 * Report an API error on a react-hook-form form: next to the field when the API
 * names it, otherwise as a global message (form "root").
 * `fieldCodes` maps an error code to the field it belongs to (e.g. email_taken -> email).
 */
export function applyApiError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  knownFields: readonly Path<T>[],
  t: Messages,
  fieldCodes: Partial<Record<string, Path<T>>> = {},
): void {
  if (error instanceof ApiError) {
    const target = fieldCodes[error.code];
    if (target) {
      setError(target, { type: "server", message: errorMessage(error, t) });
      return;
    }
    const fields = error.invalidFields.filter((f) =>
      (knownFields as readonly string[]).includes(f),
    );
    for (const field of fields) {
      setError(field as Path<T>, { type: "server", message: t.validation.invalid });
    }
    if (fields.length > 0) return;
  }
  setError("root.server", { type: "server", message: errorMessage(error, t) });
}
