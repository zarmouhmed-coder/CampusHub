/**
 * Minimal typed client for the CampusHub API.
 *
 * Requests go to the same origin (/api/v1/...): Next.js forwards them to FastAPI
 * (see next.config.ts). The session lives in an HttpOnly cookie that the browser
 * sends automatically; JavaScript never sees the token.
 */

const API_PREFIX = "/api/v1";

type ValidationIssue = { loc: (string | number)[]; msg: string; type: string };

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** Field name -> message, from FastAPI 422 responses. */
    readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const GENERIC_MESSAGES: Record<number, string> = {
  401: "Ta session a expiré. Reconnecte-toi.",
  403: "Action non autorisée.",
  404: "Élément introuvable.",
  422: "Certaines informations sont invalides.",
  429: "Trop de tentatives. Réessaie dans quelques minutes.",
};

async function toApiError(response: Response): Promise<ApiError> {
  let detail: unknown;
  try {
    detail = ((await response.json()) as { detail?: unknown }).detail;
  } catch {
    // Non-JSON body (proxy error, server down...).
  }
  if (typeof detail === "string") return new ApiError(response.status, detail);

  const fieldErrors: Record<string, string> = {};
  if (Array.isArray(detail)) {
    for (const issue of detail as ValidationIssue[]) {
      const field = issue.loc.at(-1);
      if (typeof field === "string" && issue.loc[0] === "body") {
        fieldErrors[field] ??= issue.msg.replace(/^Value error, /, "");
      }
    }
  }
  const message =
    GENERIC_MESSAGES[response.status] ??
    (response.status >= 500
      ? "Le serveur rencontre un problème. Réessaie dans un instant."
      : "Une erreur est survenue.");
  return new ApiError(response.status, message, fieldErrors);
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
    throw new ApiError(0, "Impossible de joindre le serveur. Vérifie ta connexion.");
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

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "Une erreur inattendue est survenue.";
}
