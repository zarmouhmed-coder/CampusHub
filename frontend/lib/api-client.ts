/**
 * Minimal typed client for the CampusHub API.
 *
 * Requests go to the same origin (/api/v1/...): Next.js forwards them to FastAPI
 * (see next.config.ts). The session lives in an HttpOnly cookie that the browser
 * sends automatically; JavaScript never sees the token.
 *
 * Errors carry the API's stable `code`; components translate it with
 * `errorMessage(error, t)` in the user's language.
 */

import type { Messages } from "@/lib/i18n/fr";

const API_PREFIX = "/api/v1";

type ValidationIssue = { loc: (string | number)[]; msg: string; type: string };

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    /** Field names flagged by a 422 validation error. */
    readonly invalidFields: string[] = [],
  ) {
    super(code);
    this.name = "ApiError";
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  let body: { code?: unknown; detail?: unknown } = {};
  try {
    body = (await response.json()) as typeof body;
  } catch {
    // Non-JSON body (proxy error, server down…).
  }
  const fallback =
    response.status >= 500 ? "internal_error" : response.status === 404 ? "not_found" : "generic";
  const code = typeof body.code === "string" ? body.code : fallback;

  const invalidFields: string[] = [];
  if (Array.isArray(body.detail)) {
    for (const issue of body.detail as ValidationIssue[]) {
      const field = issue.loc.at(-1);
      if (typeof field === "string" && issue.loc[0] === "body") invalidFields.push(field);
    }
  }
  return new ApiError(response.status, code, invalidFields);
}

type Query = Record<string, string | number | null | undefined>;

export async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; query?: Query; signal?: AbortSignal } = {},
): Promise<T> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== null && value !== undefined && value !== "") params.set(key, String(value));
  }
  const search = params.size ? `?${params}` : "";

  let response: Response;
  try {
    response = await fetch(`${API_PREFIX}${path}${search}`, {
      method: options.method ?? "GET",
      headers: options.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      credentials: "same-origin",
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "network");
  }

  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) =>
    apiRequest<T>(path, { query, signal }),
  post: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body: unknown) => apiRequest<T>(path, { method: "PATCH", body }),
  delete: (path: string) => apiRequest<void>(path, { method: "DELETE" }),
};

/** Human message for an error, in the user's language. */
export function errorMessage(error: unknown, t: Messages): string {
  if (error instanceof ApiError) {
    return t.errors[error.code as keyof Messages["errors"]] ?? t.errors.generic;
  }
  return t.errors.unexpected;
}
