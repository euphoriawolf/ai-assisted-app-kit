import type { Env } from "../bindings.js";

// Where to send the user to pay. `packId` picks a fixed pack; `amountCents` is pay-as-you-go.
export interface CheckoutOptions {
  packId?: string;
  amountCents?: number;
  userId: string;
  userEmail?: string;
  successUrl: string;
}

// A normalized "money received -> grant credits" event, parsed from a provider's webhook. Adapters
// map their own payloads onto this shape so the webhook route stays provider-agnostic.
export interface GrantEvent {
  providerOrderId: string;
  userId?: string; // echoed back from checkout metadata, when the provider supports it
  email?: string;
  amountCents: number;
  bonusPct: number; // volume-pack bonus (0 for pay-as-you-go)
  productId?: string;
}

// Provider-agnostic payments seam — the same idea as the AI/provider abstraction. Add one adapter
// per market (polar ships as a reference; write stripe/paddle/lemonsqueezy/local the same way) and
// select it with FEATURES.billing.provider. `none` disables checkout entirely.
export interface PaymentProvider {
  readonly name: string;
  // Create a hosted checkout and return its URL. Throw "NOT_CONFIGURED" if product ids are missing.
  createCheckout(env: Env, opts: CheckoutOptions): Promise<{ url: string }>;
  // Verify the signature and parse the raw webhook into a grant, or null to ignore. Throw on a bad
  // signature so the route can 401.
  parseWebhook(env: Env, headers: Headers, rawBody: string): Promise<GrantEvent | null>;
}
