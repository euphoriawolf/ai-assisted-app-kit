// ============================================================
// Feature flags — the malleability switches.
//
// Nothing business-model-specific is baked into the core: auth + the resource (items) + the queue
// job ALWAYS work with these all off. Turn a layer on only if your app needs it. Credits and
// billing are independent — you can have neither, either, or both.
// ============================================================
export const FEATURES = {
  // Credits = an optional metering / entitlement layer. When off, users create resources freely
  // (no balance, no 402). Turn on only if your app meters usage.
  credits: {
    enabled: false,
    // When true AND credits are enabled, creating a resource spends credits (402 if short).
    // When false, credits exist but don't gate creation (e.g. they unlock something else).
    gateCreation: true,
    // Credits granted to a new user on signup (only applied when credits are enabled). Set a
    // positive number to give a free trial; leave 0 for pay-first.
    initialGrant: 0,
  },

  // Billing = an optional, provider-agnostic way to get paid. "none" ships no checkout. Swap in an
  // adapter under packages/api/src/billing (polar ships as a reference; add stripe/paddle/etc.) and
  // set the provider to charge in your market. Enabling billing implies credits are how you sell.
  billing: {
    enabled: false,
    provider: "none" as "none" | "polar" | "stripe",
  },
} as const;
