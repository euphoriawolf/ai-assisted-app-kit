import type { PaymentProvider } from "./base.js";

// The default: no billing. The checkout/webhook routes 404 when billing is disabled, so these are
// never reached — but we implement the interface so the factory always returns a provider.
export const noneProvider: PaymentProvider = {
  name: "none",
  async createCheckout() {
    throw new Error("NOT_CONFIGURED");
  },
  async parseWebhook() {
    return null;
  },
};
