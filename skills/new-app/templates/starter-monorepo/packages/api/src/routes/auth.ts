import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { Env, Variables } from "../bindings.js";
import {
  upsertUserFromGoogle,
  upsertUserFromMagicLink,
  createSession,
  deleteSession,
  sendMagicLink,
  verifyMagicLinkToken,
} from "../services/auth.service.js";
import { authMiddleware, parseCookies } from "../middleware/auth.js";
import { MagicLinkRequestSchema } from "@app/shared/schemas";
import { AuthError } from "@app/shared/errors";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { users } from "@app/db";

const auth = new Hono<{ Bindings: Env; Variables: Variables }>();

const SESSION_COOKIE = "session";
const OAUTH_STATE_COOKIE = "oauth_state";

// In prod set COOKIE_DOMAIN (e.g. ".example.com") so the cookie is readable by the web app's SSR
// on a sibling subdomain. Localhost leaves it unset → host-only cookie.
function sessionCookieOptions(env: Pick<Env, "COOKIE_DOMAIN">) {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "Lax" as const,
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

function sessionCookieClearOptions(env: Pick<Env, "COOKIE_DOMAIN">) {
  return { path: "/", ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}) };
}

// Only allow same-origin relative paths to prevent open redirects.
function sanitizeNext(next: string | undefined): string {
  if (!next) return "/dashboard";
  if (!next.startsWith("/")) return "/dashboard";
  if (next.startsWith("//") || next.startsWith("/\\")) return "/dashboard";
  if (next.includes("://")) return "/dashboard";
  return next;
}

// GET /api/v1/auth/google — initiate OAuth flow
auth.get("/google", (c) => {
  const redirectUri = `${c.env.APP_URL}/api/v1/auth/google/callback`;
  const next = c.req.query("next");
  const csrf = crypto.randomUUID();
  const state = btoa(JSON.stringify({ csrf, next: sanitizeNext(next) }));

  setCookie(c, OAUTH_STATE_COOKIE, csrf, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax" as const,
    path: "/",
    maxAge: 10 * 60,
  });

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", c.env.GOOGLE_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "select_account");
  authUrl.searchParams.set("state", state);

  return c.redirect(authUrl.toString(), 302);
});

// GET /api/v1/auth/google/callback
auth.get("/google/callback", async (c) => {
  const code = c.req.query("code");
  const stateParam = c.req.query("state");
  const frontendUrl = c.env.FRONTEND_URL ?? c.env.APP_URL;

  if (!code) return c.redirect(`${frontendUrl}/login?error=no_code`, 302);

  let next = "/dashboard";
  try {
    const { csrf, next: stateNext } = JSON.parse(atob(stateParam ?? "")) as { csrf: string; next: string };
    const storedCsrf = getCookie(c, OAUTH_STATE_COOKIE);
    deleteCookie(c, OAUTH_STATE_COOKIE, { path: "/" });
    if (!storedCsrf || storedCsrf !== csrf) throw new Error("CSRF mismatch");
    next = sanitizeNext(stateNext);
  } catch {
    return c.redirect(`${frontendUrl}/login?error=invalid_state`, 302);
  }

  try {
    const redirectUri = `${c.env.APP_URL}/api/v1/auth/google/callback`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: c.env.GOOGLE_CLIENT_ID,
        client_secret: c.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) throw new Error(`Token exchange failed: ${await tokenRes.text()}`);
    const tokens = (await tokenRes.json()) as { access_token: string };

    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!userInfoRes.ok) throw new Error("Failed to get user info");
    const googleUser = (await userInfoRes.json()) as { id: string; email: string; name: string; picture: string };

    const user = await upsertUserFromGoogle(c.env, googleUser);
    const sessionToken = await createSession(c.env, user.id);

    setCookie(c, SESSION_COOKIE, sessionToken, sessionCookieOptions(c.env));
    return c.redirect(`${frontendUrl}${next}`, 302);
  } catch (err) {
    console.error("Google OAuth error:", err);
    return c.redirect(`${frontendUrl}/login?error=oauth_failed`, 302);
  }
});

// POST /api/v1/auth/magic-link — send magic link email
auth.post("/magic-link", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = MagicLinkRequestSchema.safeParse(body);

  // Always return success to prevent email enumeration.
  if (!parsed.success) {
    return c.json({ ok: true, message: "If that email is valid, you'll receive a link shortly." });
  }

  const next = sanitizeNext(parsed.data.next);
  c.executionCtx.waitUntil(
    sendMagicLink(c.env, parsed.data.email, next).catch((err) => console.error("Magic link send error:", err)),
  );
  return c.json({ ok: true, message: "If that email is valid, you'll receive a link shortly." });
});

// GET /api/v1/auth/magic-link/verify
auth.get("/magic-link/verify", async (c) => {
  const token = c.req.query("token");
  const next = sanitizeNext(c.req.query("next"));
  const frontendUrl = c.env.FRONTEND_URL ?? c.env.APP_URL;

  if (!token) return c.redirect(`${frontendUrl}/login?error=invalid_token`, 302);

  try {
    const email = await verifyMagicLinkToken(c.env, token);
    const user = await upsertUserFromMagicLink(c.env, email);
    const sessionToken = await createSession(c.env, user.id);
    setCookie(c, SESSION_COOKIE, sessionToken, sessionCookieOptions(c.env));
    return c.redirect(`${frontendUrl}${next}`, 302);
  } catch {
    return c.redirect(`${frontendUrl}/login?error=invalid_token`, 302);
  }
});

// GET /api/v1/auth/me
auth.get("/me", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const db = drizzle(c.env.DB);
  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name, avatar: users.avatar, role: users.role, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) throw new AuthError();
  return c.json({ ok: true, data: user });
});

// POST /api/v1/auth/logout
auth.post("/logout", async (c) => {
  const cookies = parseCookies(c.req.header("cookie") ?? "");
  const sessionToken = cookies[SESSION_COOKIE];
  if (sessionToken) await deleteSession(c.env, sessionToken).catch(() => {});
  deleteCookie(c, SESSION_COOKIE, sessionCookieClearOptions(c.env));
  return c.json({ ok: true });
});

export { auth as authRoutes };
