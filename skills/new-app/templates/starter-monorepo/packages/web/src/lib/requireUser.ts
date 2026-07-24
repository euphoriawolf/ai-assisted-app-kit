import type { APIContext } from "astro";
import type { Me } from "./api";

// Resolve the signed-in user during SSR by forwarding the browser's cookie to the API worker.
//
// Three deliberate details, each one a bug we do not want to reintroduce:
//  1. Cheap cookie sniff FIRST. Anonymous traffic (most marketing hits) skips the network
//     round-trip entirely instead of paying for a doomed fetch on every request.
//  2. Forward the RAW cookie header. SSR runs on the web worker, so the browser's cookie is not
//     attached automatically to a worker-to-worker fetch.
//  3. try/catch -> null. If the API is down, callers redirect to /login instead of throwing a 500.
export async function getUser(request: Request, apiBase: string): Promise<Me | null> {
  const cookie = request.headers.get("cookie") ?? "";
  if (!cookie.includes("session")) return null;

  try {
    const res = await fetch(`${apiBase}/api/v1/auth/me`, { headers: { cookie } });
    if (!res.ok) return null;
    const body = (await res.json()) as { ok: boolean; data?: Me };
    return body.data ?? null;
  } catch {
    return null;
  }
}

// Per-page guard for any page not covered by middleware. Usage:
//   const r = await requireUser(Astro);
//   if (r instanceof Response) return r;
export async function requireUser(context: APIContext): Promise<Me | Response> {
  const existing = context.locals.user;
  if (existing) return existing;

  const { resolveApiBase } = await import("./apiBase");
  const user = await getUser(context.request, resolveApiBase(context));
  if (!user) {
    const next = context.url.pathname + context.url.search;
    return context.redirect(`/login?next=${encodeURIComponent(next)}`, 302);
  }
  return user;
}
