import { Hono } from "hono";
import type { Env, Variables } from "../bindings.js";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { users, orders } from "@app/db";
import { addCredits } from "../services/credit.service.js";
import { sendEmail, purchaseConfirmationEmail } from "../services/email.service.js";
import { creditsForDollars, FEATURES } from "@app/shared/constants";
import { getPaymentProvider } from "../billing/factory.js";
import type { GrantEvent } from "../billing/base.js";

const webhookRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// POST /api/v1/webhooks/billing — provider-agnostic. The selected adapter verifies the signature
// and parses the payload into a GrantEvent; we grant credits. Point your provider's webhook here.
// Credits are DERIVED from amount + bonus (never a stored count), so a price change never
// mischarges. 404s when billing is off.
webhookRoutes.post("/billing", async (c) => {
  if (!FEATURES.billing.enabled) return c.json({ error: "Billing disabled" }, 404);

  const rawBody = await c.req.text();
  let grant: GrantEvent | null;
  try {
    grant = await getPaymentProvider(c.env).parseWebhook(c.env, c.req.raw.headers, rawBody);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "bad webhook" }, 401);
  }
  if (!grant) return c.json({ ok: true });

  try {
    await grantCredits(c.env, grant);
  } catch (err) {
    console.error(JSON.stringify({ level: "error", message: "billing webhook grant error", error: String(err) }));
    return c.json({ ok: false, error: String(err) });
  }
  return c.json({ ok: true });
});

async function grantCredits(env: Env, g: GrantEvent): Promise<void> {
  const db = drizzle(env.DB);

  let user: { id: string } | undefined;
  if (g.userId) [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, g.userId)).limit(1);
  if (!user && g.email) [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, g.email)).limit(1);
  if (!user) {
    console.warn(JSON.stringify({ level: "warn", message: "Order for unknown user", orderId: g.providerOrderId }));
    return;
  }

  // Dedupe by the provider order id.
  const [existing] = await db.select({ id: orders.id }).from(orders).where(eq(orders.providerOrderId, g.providerOrderId)).limit(1);
  if (existing) return;

  const creditAmount = creditsForDollars(g.amountCents / 100, g.bonusPct);
  if (creditAmount <= 0) return;

  const localOrderId = crypto.randomUUID();
  await db.insert(orders).values({
    id: localOrderId,
    userId: user.id,
    provider: getPaymentProvider(env).name,
    providerOrderId: g.providerOrderId,
    amountCents: g.amountCents,
    currency: "usd",
    creditsGranted: creditAmount,
    status: "completed",
    metadata: JSON.stringify({ productId: g.productId }),
  });
  await addCredits(db, user.id, creditAmount, "purchase", `Credit purchase: ${creditAmount} credits`, localOrderId);

  const [row] = await db.select({ email: users.email, name: users.name }).from(users).where(eq(users.id, user.id)).limit(1);
  if (row) {
    sendEmail(
      env,
      row.email,
      purchaseConfirmationEmail({ name: row.name ?? null, credits: creditAmount, amountCents: g.amountCents, currency: "usd" }),
    ).catch((err) => console.error("Purchase confirmation email failed:", err));
  }
}

export { webhookRoutes };
