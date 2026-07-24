import type { Env } from "../bindings.js";
import { FEATURES } from "@app/shared/constants";
import type { PaymentProvider } from "./base.js";
import { polarProvider } from "./polar.js";
import { noneProvider } from "./none.js";

// Select the payment adapter by config. Register new markets here.
export function getPaymentProvider(_env: Env): PaymentProvider {
  switch (FEATURES.billing.provider) {
    case "polar":
      return polarProvider;
    // case "stripe": return stripeProvider;  // add your adapter in billing/stripe.ts
    default:
      return noneProvider;
  }
}
