import { drizzle } from "drizzle-orm/d1";
import { eq, and, lt } from "drizzle-orm";
import { users, sessions, credits, magicLinkTokens } from "@app/db";
import type { Env } from "../bindings.js";
import { AuthError } from "@app/shared/errors";
import { FEATURES } from "@app/shared/constants";
import { sendEmail, magicLinkEmail, welcomeEmail } from "./email.service.js";

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAGIC_LINK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export async function upsertUserFromGoogle(env: Env, googleUser: GoogleUserInfo) {
  const db = drizzle(env.DB);
  const isNew = !(await db.select({ id: users.id }).from(users).where(eq(users.email, googleUser.email)).limit(1))[0];

  await db
    .insert(users)
    .values({
      email: googleUser.email,
      name: googleUser.name,
      avatar: googleUser.picture,
      authProvider: "google",
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: users.email,
      set: { name: googleUser.name, avatar: googleUser.picture, updatedAt: new Date().toISOString() },
    });

  const [user] = await db.select().from(users).where(eq(users.email, googleUser.email)).limit(1);
  if (!user) throw new Error("Failed to upsert user");

  await ensureCreditsRow(db, user.id);
  if (isNew) sendWelcome(env, user.email, user.name);
  return user;
}

export async function upsertUserFromMagicLink(env: Env, email: string) {
  const db = drizzle(env.DB);
  const isNew = !(await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1))[0];

  await db
    .insert(users)
    .values({ email, authProvider: "magic_link", updatedAt: new Date().toISOString() })
    .onConflictDoUpdate({ target: users.email, set: { updatedAt: new Date().toISOString() } });

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) throw new Error("Failed to upsert user");

  await ensureCreditsRow(db, user.id);
  if (isNew) sendWelcome(env, user.email, user.name ?? null);
  return user;
}

function sendWelcome(env: Env, email: string, name: string | null): void {
  sendEmail(env, email, welcomeEmail(name, `${env.FRONTEND_URL}/dashboard`)).catch((err) =>
    console.error("Welcome email failed:", err),
  );
}

async function ensureCreditsRow(db: ReturnType<typeof drizzle>, userId: string) {
  // Only bother when credits are on. A new user gets initialGrant (0 = pay-first; positive = trial).
  if (!FEATURES.credits.enabled) return;
  await db.insert(credits).values({ userId, balance: FEATURES.credits.initialGrant }).onConflictDoNothing();
}

export async function createSession(env: Env, userId: string): Promise<string> {
  const db = drizzle(env.DB);
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
  await db.insert(sessions).values({ userId, token, expiresAt });
  return token;
}

export async function deleteSession(env: Env, token: string): Promise<void> {
  const db = drizzle(env.DB);
  await db.delete(sessions).where(eq(sessions.token, token));
  await env.SESSION_CACHE.delete(`session:${token}`);
}

export async function sendMagicLink(env: Env, email: string, next?: string): Promise<void> {
  const db = drizzle(env.DB);
  await db.delete(magicLinkTokens).where(and(eq(magicLinkTokens.email, email)));

  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + MAGIC_LINK_DURATION_MS).toISOString();
  await db.insert(magicLinkTokens).values({ email, token, expiresAt });

  let link = `${env.APP_URL}/api/v1/auth/magic-link/verify?token=${token}`;
  if (next) link += `&next=${encodeURIComponent(next)}`;

  // In dev, print the link so you can sign in without a real mailbox.
  if (env.ENVIRONMENT !== "production") console.log(`\n[magic-link:dev] ${link}\n`);

  await sendEmail(env, email, magicLinkEmail(link));
}

export async function verifyMagicLinkToken(env: Env, token: string): Promise<string> {
  const db = drizzle(env.DB);
  const now = new Date().toISOString();

  const [row] = await db.select().from(magicLinkTokens).where(eq(magicLinkTokens.token, token)).limit(1);
  if (!row) throw new AuthError("Invalid or expired magic link");
  if (row.usedAt) throw new AuthError("Magic link already used");
  if (row.expiresAt < now) throw new AuthError("Magic link expired");

  await db.update(magicLinkTokens).set({ usedAt: new Date().toISOString() }).where(eq(magicLinkTokens.id, row.id));
  return row.email;
}

export async function cleanupExpiredTokens(env: Env): Promise<void> {
  const db = drizzle(env.DB);
  const now = new Date().toISOString();
  await db.delete(magicLinkTokens).where(lt(magicLinkTokens.expiresAt, now));
  await db.delete(sessions).where(lt(sessions.expiresAt, now));
}

function generateSecureToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
