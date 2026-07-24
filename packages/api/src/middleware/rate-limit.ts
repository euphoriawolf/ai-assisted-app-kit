import type { Context, Next } from "hono";
import type { Env, Variables } from "../bindings.js";
import { RateLimitError } from "@app/shared/errors";

type HonoCtx = Context<{ Bindings: Env; Variables: Variables }>;

const WINDOW_SECONDS = 60;
const DEFAULT_LIMIT = 60; // requests per minute per API key

export async function apiKeyRateLimitMiddleware(c: HonoCtx, next: Next): Promise<void> {
  const keyId = c.get("apiKeyId");
  if (!keyId) return next(); // session auth — no rate limit here

  const kvKey = `ratelimit:${keyId}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - WINDOW_SECONDS;

  const raw = (await c.env.RATE_LIMIT.get(kvKey, "json")) as { count: number; windowStart: number } | null;
  const current = raw && raw.windowStart > windowStart ? raw : { count: 0, windowStart: now };

  if (current.count >= DEFAULT_LIMIT) {
    throw new RateLimitError(`Rate limit exceeded: ${DEFAULT_LIMIT} requests per ${WINDOW_SECONDS}s`);
  }

  current.count += 1;
  await c.env.RATE_LIMIT.put(kvKey, JSON.stringify(current), { expirationTtl: WINDOW_SECONDS * 2 });

  c.header("X-RateLimit-Limit", String(DEFAULT_LIMIT));
  c.header("X-RateLimit-Remaining", String(DEFAULT_LIMIT - current.count));
  return next();
}

// Session-auth limiter keyed by userId + a per-route `label`, so a scripted loop can't drive
// unbounded work (and, when a step calls a paid provider, unbounded spend). Apply to any route
// that kicks off expensive/async work (e.g. creating an item).
export function sessionRateLimitMiddleware(label: string, limit: number, windowSeconds = 60) {
  return async (c: HonoCtx, next: Next): Promise<void> => {
    const userId = c.get("userId");
    if (!userId) return next();

    const kvKey = `ratelimit:session:${label}:${userId}`;
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - windowSeconds;

    const raw = (await c.env.RATE_LIMIT.get(kvKey, "json")) as { count: number; windowStart: number } | null;
    const current = raw && raw.windowStart > windowStart ? raw : { count: 0, windowStart: now };

    if (current.count >= limit) {
      throw new RateLimitError(`Rate limit exceeded: ${limit} requests per ${windowSeconds}s`);
    }

    current.count += 1;
    await c.env.RATE_LIMIT.put(kvKey, JSON.stringify(current), { expirationTtl: windowSeconds * 2 });
    return next();
  };
}
