import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env, Variables } from "./bindings.js";
import { loggerMiddleware } from "./middleware/logger.js";
import { errorHandler } from "./middleware/error-handler.js";
import { authRoutes } from "./routes/auth.js";
import { itemRoutes } from "./routes/items.js";
import { creditRoutes } from "./routes/credits.js";
import { checkoutRoutes } from "./routes/checkout.js";
import { webhookRoutes } from "./routes/webhooks.js";
import { cleanupExpiredTokens } from "./services/auth.service.js";
import { getFile } from "./services/storage.service.js";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use("*", loggerMiddleware);

// Cross-origin: the web app (a different subdomain in prod) calls this API with credentials, so
// reflect the FRONTEND_URL origin and allow cookies.
app.use("/api/*", cors({
  origin: (origin, c) => {
    const frontend = (c.env as Env).FRONTEND_URL;
    return origin && origin === frontend ? origin : frontend;
  },
  credentials: true,
}));

app.onError(errorHandler);

app.get("/health", (c) => c.json({ ok: true, status: "healthy", env: c.env.ENVIRONMENT }));

app.route("/api/v1/auth", authRoutes);
app.route("/api/v1/items", itemRoutes);
app.route("/api/v1/credits", creditRoutes);
app.route("/api/v1/checkout", checkoutRoutes);
app.route("/api/v1/webhooks", webhookRoutes);

// R2 file proxy for public artifacts. Swap for signed URLs if you need private, time-limited access.
app.get("/files/*", async (c) => {
  const key = c.req.path.replace(/^\/files\//, "");
  const obj = await getFile(c.env, key);
  if (!obj) return c.notFound();
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  return new Response(obj.body, { headers });
});

// In prod the Astro web build is bound as ASSETS and served here. In dev the web app runs on :4321.
app.get("*", async (c) => {
  if (c.env.ASSETS) return c.env.ASSETS.fetch(c.req.raw);
  return c.notFound();
});

export default {
  fetch: (req: Request, env: Env, ctx: ExecutionContext) => app.fetch(req, env, ctx),
  // Daily cron (wired in wrangler.jsonc): purge expired sessions + magic-link tokens.
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(cleanupExpiredTokens(env).catch((err) => console.error("cron cleanup failed:", err)));
  },
};
