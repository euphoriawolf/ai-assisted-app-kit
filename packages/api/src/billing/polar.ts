import type { Env } from "../bindings.js";
import type { PaymentProvider, CheckoutOptions, GrantEvent } from "./base.js";
import { CREDIT_PACKS, PRICING } from "@app/shared/constants";

// Reference adapter: Polar.sh. Copy this file to add another provider (Stripe, Paddle, Lemon
// Squeezy, a local processor) — implement createCheckout + parseWebhook against their API and
// register it in factory.ts. Nothing outside this file knows about Polar.
const PACK_ENV_KEY: Record<string, keyof Env> = {
  creator_pack: "POLAR_PRODUCT_CREATOR",
  pro_pack: "POLAR_PRODUCT_PRO",
  studio_pack: "POLAR_PRODUCT_STUDIO",
};

export const polarProvider: PaymentProvider = {
  name: "polar",

  async createCheckout(env, opts: CheckoutOptions) {
    let productId: string | undefined;
    let amount: number | undefined;
    const meta: Record<string, string> = { userId: opts.userId };

    if (opts.packId) {
      if (!(opts.packId in PACK_ENV_KEY) || !CREDIT_PACKS.some((p) => p.id === opts.packId)) {
        throw new Error("INVALID_PACK");
      }
      productId = env[PACK_ENV_KEY[opts.packId]!] as string | undefined;
      meta.packId = opts.packId;
    } else if (opts.amountCents !== undefined) {
      productId = env.POLAR_PRODUCT_PAYG;
      meta.payg = "1";
      amount = opts.amountCents;
    }
    // No stale-id mischarge: if the product isn't wired, fail clean.
    if (!productId) throw new Error("NOT_CONFIGURED");

    const base = env.ENVIRONMENT === "production" ? "https://api.polar.sh" : "https://sandbox-api.polar.sh";
    const res = await fetch(`${base}/v1/checkouts/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.POLAR_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        products: [productId],
        // `amount` is honored only for custom-priced products (PAYG); Polar ignores it for packs.
        ...(amount !== undefined ? { amount } : {}),
        success_url: opts.successUrl,
        customer_email: opts.userEmail,
        metadata: meta,
      }),
    });
    if (!res.ok) {
      console.error("[polar] checkout error", res.status, await res.text());
      throw new Error("CHECKOUT_FAILED");
    }
    const data = (await res.json()) as { url: string };
    return { url: data.url };
  },

  async parseWebhook(env, headers, rawBody): Promise<GrantEvent | null> {
    const id = headers.get("webhook-id") ?? "";
    const ts = headers.get("webhook-timestamp") ?? "";
    const sig = headers.get("webhook-signature") ?? "";
    if (!(await verifyPolarSignature(id, ts, rawBody, sig, env.POLAR_WEBHOOK_SECRET))) {
      throw new Error("Invalid signature");
    }

    const event = JSON.parse(rawBody) as { type: string; data: PolarOrder };
    if (event.type !== "order.created" && event.type !== "order.paid") return null;

    const order = event.data;
    const rawBonus = order.product?.metadata?.["bonus_pct"];
    const bonusPct = typeof rawBonus === "number" && rawBonus > 0 ? Math.min(rawBonus, PRICING.MAX_BONUS_PCT) : 0;
    const userId = typeof order.metadata?.["userId"] === "string" ? (order.metadata["userId"] as string) : undefined;
    const email = order.customer?.email ?? order.customer_email;

    return {
      providerOrderId: order.id,
      amountCents: order.amount ?? 0,
      bonusPct,
      ...(userId ? { userId } : {}),
      ...(email ? { email } : {}),
      ...(order.product?.id ? { productId: order.product.id } : {}),
    };
  },
};

// Standard Webhooks (https://www.standardwebhooks.com). HMAC key = UTF-8 bytes of the full secret
// (incl. the polar_whs_ prefix); signed content = `${id}.${timestamp}.${body}`; header is a
// space-separated list of `v1,<base64sig>`.
async function verifyPolarSignature(id: string, ts: string, body: string, header: string, secret: string): Promise<boolean> {
  if (!header || !id || !ts || !secret) return false;
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sigBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(`${id}.${ts}.${body}`));
    const expected = bytesToBase64(new Uint8Array(sigBuffer));
    return header.split(" ").some((entry) => {
      const [version, sig] = entry.split(",");
      return version === "v1" && sig === expected;
    });
  } catch {
    return false;
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

interface PolarOrder {
  id: string;
  amount?: number;
  customer_email?: string;
  customer?: { email?: string };
  product?: { id?: string; metadata?: Record<string, unknown> };
  metadata?: Record<string, unknown>;
}
