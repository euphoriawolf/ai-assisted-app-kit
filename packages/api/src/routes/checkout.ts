import { Hono } from "hono";
import type { Env, Variables } from "../bindings.js";
import { authMiddleware } from "../middleware/auth.js";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { users } from "@app/db";
import { PRICING, FEATURES } from "@app/shared/constants";
import { getPaymentProvider } from "../billing/factory.js";

const checkoutRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /api/v1/checkout?pack=<packId> | ?amount=<cents>
// Provider-agnostic: the selected adapter builds the hosted checkout. 404s when billing is off.
// NOTE: the browser navigates here directly, so on the web side build it with API_BASE (the dev
// proxy is fetch-only), or it 404s against the web origin in prod (the cross-origin gotcha).
checkoutRoutes.get("/", authMiddleware, async (c) => {
  if (!FEATURES.billing.enabled) {
    return c.json({ ok: false, error: { code: "BILLING_DISABLED", message: "Billing is not enabled" } }, 404);
  }

  const packId = c.req.query("pack");
  const amountRaw = c.req.query("amount");

  let amountCents: number | undefined;
  if (amountRaw !== undefined) {
    amountCents = Number(amountRaw);
    const min = PRICING.PAYG_MIN_DOLLARS * 100;
    const max = PRICING.PAYG_MAX_DOLLARS * 100;
    if (!Number.isInteger(amountCents) || amountCents < min || amountCents > max) {
      return c.json(
        { ok: false, error: { code: "INVALID_AMOUNT", message: `Amount must be $${PRICING.PAYG_MIN_DOLLARS}–$${PRICING.PAYG_MAX_DOLLARS}` } },
        400,
      );
    }
  } else if (!packId) {
    return c.json({ ok: false, error: { code: "INVALID_REQUEST", message: "Provide ?pack or ?amount" } }, 400);
  }

  const userId = c.get("userId");
  const db = drizzle(c.env.DB);
  const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);

  try {
    const { url } = await getPaymentProvider(c.env).createCheckout(c.env, {
      userId,
      successUrl: `${c.env.FRONTEND_URL}/dashboard/billing?purchased=1`,
      ...(packId ? { packId } : {}),
      ...(amountCents !== undefined ? { amountCents } : {}),
      ...(user?.email ? { userEmail: user.email } : {}),
    });
    return c.redirect(url, 303);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "CHECKOUT_FAILED";
    if (msg === "NOT_CONFIGURED") return c.json({ ok: false, error: { code: "NOT_CONFIGURED", message: "Checkout is not configured yet" } }, 503);
    if (msg === "INVALID_PACK") return c.json({ ok: false, error: { code: "INVALID_PACK", message: "Invalid credit pack" } }, 400);
    console.error("[checkout]", msg);
    return c.json({ ok: false, error: { code: "CHECKOUT_FAILED", message: "Failed to create checkout" } }, 502);
  }
});

export { checkoutRoutes };
