import type { Context, Next } from "hono";
import type { Env, Variables } from "../bindings.js";
import { drizzle } from "drizzle-orm/d1";
import { eq, and, gt } from "drizzle-orm";
import { sessions, users, apiKeys } from "@app/db";
import { AuthError } from "@app/shared/errors";

type HonoCtx = Context<{ Bindings: Env; Variables: Variables }>;

const SESSION_COOKIE = "session";
const SESSION_CACHE_TTL = 300; // 5 minutes

interface ResolvedUser {
  id: string;
  email: string;
  role: string;
}

export async function authMiddleware(c: HonoCtx, next: Next): Promise<void> {
  const user = await resolveUser(c);
  if (!user) throw new AuthError();
  c.set("userId", user.id);
  c.set("userEmail", user.email);
  c.set("userRole", user.role);
  await next();
}

export async function optionalAuthMiddleware(c: HonoCtx, next: Next): Promise<void> {
  const user = await resolveUser(c);
  if (user) {
    c.set("userId", user.id);
    c.set("userEmail", user.email);
    c.set("userRole", user.role);
  }
  await next();
}

async function resolveUser(c: HonoCtx): Promise<ResolvedUser | null> {
  // API key auth first (public API): Authorization: Bearer sk-...
  const authHeader = c.req.header("authorization");
  if (authHeader?.startsWith("Bearer sk-")) {
    return resolveApiKey(c, authHeader.slice(7));
  }

  // Session cookie
  const cookieHeader = c.req.header("cookie") ?? "";
  const cookies = parseCookies(cookieHeader);
  const sessionToken = cookies[SESSION_COOKIE];
  if (sessionToken) {
    return resolveSession(c, sessionToken);
  }

  return null;
}

async function resolveSession(c: HonoCtx, token: string): Promise<ResolvedUser | null> {
  const cacheKey = `session:${token}`;
  const cached = (await c.env.SESSION_CACHE.get(cacheKey, "json")) as ResolvedUser | null;
  if (cached) return cached;

  const db = drizzle(c.env.DB);
  const now = new Date().toISOString();

  const [row] = await db
    .select({ id: users.id, email: users.email, role: users.role })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, now), eq(users.isActive, true)))
    .limit(1);

  if (!row) return null;

  await c.env.SESSION_CACHE.put(cacheKey, JSON.stringify(row), { expirationTtl: SESSION_CACHE_TTL });
  return row;
}

async function resolveApiKey(c: HonoCtx, rawKey: string): Promise<ResolvedUser | null> {
  const keyHash = await sha256(rawKey);
  const db = drizzle(c.env.DB);

  const [row] = await db
    .select({ id: users.id, email: users.email, role: users.role, keyId: apiKeys.id })
    .from(apiKeys)
    .innerJoin(users, eq(apiKeys.userId, users.id))
    .where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.isActive, true), eq(users.isActive, true)))
    .limit(1);

  if (!row) return null;

  c.set("apiKeyId", row.keyId);
  return { id: row.id, email: row.email, role: row.role };
}

export function adminMiddleware(c: HonoCtx, next: Next): Promise<void> {
  const role = c.get("userRole");
  if (role !== "admin") throw new AuthError("Admin access required");
  return next();
}

export function parseCookies(cookieHeader: string): Record<string, string> {
  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => {
        const idx = c.indexOf("=");
        return [c.slice(0, idx).trim(), decodeURIComponent(c.slice(idx + 1).trim())];
      }),
  );
}

export async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
