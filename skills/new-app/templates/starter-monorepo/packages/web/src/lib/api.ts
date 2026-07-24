// Typed API client. Base URL comes from PUBLIC_API_BASE_URL (Astro env).
//   Dev (browser): "" -> the Vite dev proxy forwards /api -> :8787 (same-origin, no CORS).
//   Dev (SSR):     absolute http://localhost:8787 (server-to-server needs an absolute URL).
//   Prod:          the absolute API origin (api.example.com) in BOTH browser and SSR, so
//                  server-rendered links (e.g. the Google sign-in button) match the client.
// All requests send credentials so the session cookie flows transparently.
const API_ORIGIN = import.meta.env?.PUBLIC_API_BASE_URL || "";
const BASE_URL = (() => {
  if (API_ORIGIN) return API_ORIGIN;
  if (import.meta.env?.DEV) return typeof window === "undefined" ? "http://localhost:8787" : "";
  return "";
})();

// Absolute base for URLs the BROWSER navigates to directly (OAuth start, checkout), which can't
// go through the Vite dev proxy. Use this for <a href> and window.location, NOT apiFetch. Getting
// this wrong 404s against the web origin in prod (the classic cross-origin gotcha — see CLAUDE.md).
export const API_BASE = BASE_URL;

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const defaultHeaders: HeadersInit = init.body instanceof FormData ? {} : { "Content-Type": "application/json" };
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { ...defaultHeaders, ...init.headers },
  });

  if (!res.ok) {
    let code = "UNKNOWN";
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: { code?: string; message?: string } };
      code = body.error?.code ?? code;
      message = body.error?.message ?? message;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, code, message);
  }

  if (res.status === 204) return undefined as T;
  const json = (await res.json()) as { ok: boolean; data?: T };
  return json.data as T;
}

// ---- Typed helpers for the example resource + auth + credits ----

export interface Me {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  role: string;
}
export interface Item {
  id: string;
  title: string;
  status: "pending" | "processing" | "done" | "failed";
  progress: number;
  progressMessage: string | null;
  resultKey: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export const api = {
  me: () => apiFetch<Me>("/api/v1/auth/me"),
  logout: () => apiFetch("/api/v1/auth/logout", { method: "POST" }),
  sendMagicLink: (email: string, next?: string) =>
    apiFetch("/api/v1/auth/magic-link", { method: "POST", body: JSON.stringify({ email, next }) }),
  credits: () => apiFetch<{ balance: number }>("/api/v1/credits"),
  packs: () => apiFetch<{ packs: unknown[]; payg: { min: number; max: number; creditsPerDollar: number } }>("/api/v1/credits/packs"),
  listItems: () => apiFetch<{ items: Item[]; total: number; hasMore: boolean }>("/api/v1/items"),
  getItem: (id: string) => apiFetch<Item>(`/api/v1/items/${id}`),
  createItem: (title: string) => apiFetch<{ id: string; status: string }>("/api/v1/items", { method: "POST", body: JSON.stringify({ title }) }),
  deleteItem: (id: string) => apiFetch(`/api/v1/items/${id}`, { method: "DELETE" }),
};
