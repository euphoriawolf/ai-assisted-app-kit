import type { APIContext } from "astro";
import { SERVER_API_BASE } from "./api";

// Resolving the API origin during SSR needs a 3-level fallback, because each source can be missing:
//   1. locals.runtime.env — the real Worker binding, but middleware can run before `runtime` is
//      populated, so it cannot be relied on alone.
//   2. import.meta.env — inlined at BUILD time; absent at runtime when no .env existed at build.
//   3. a hardcoded constant — the only source that is always present in production.
// In dev we use the request's own origin so the Vite proxy handles /api and the session cookie
// stays first-party (exactly mirroring production's same-registrable-domain setup).
export function resolveApiBase(context: APIContext): string {
  if (import.meta.env.DEV) return context.url.origin;

  const runtimeEnv = (context.locals as { runtime?: { env?: { PUBLIC_API_BASE_URL?: string } } })
    .runtime?.env;

  return runtimeEnv?.PUBLIC_API_BASE_URL || import.meta.env.PUBLIC_API_BASE_URL || SERVER_API_BASE;
}
