// Credit cost of each billable action. A "unit" is one core action (creating one Item). Tune the
// numbers to your COGS. Change PRICING.CREDITS_PER_DOLLAR to reprice — never these — so existing
// balances keep their value (see the note on PRICING below).
export const CREDIT_COSTS = {
  CREATE_ITEM: 10,
  REGENERATE: 5,
  EXPORT: 2,
  VIEW: 0,
} as const;

// This is the ONE dynamic price lever: change CREDITS_PER_DOLLAR and redeploy, and pay-as-you-go
// plus every pack reprice with zero Polar edits, because no Polar product carries a hardcoded
// credit count (see creditsForDollars + the bonus_pct webhook contract in routes/webhooks.ts).
//
// Reprice by setting credits-per-dollar, never by changing CREDIT_COSTS. That keeps every existing
// balance worth exactly as many units as before (a 300-credit balance is 30 units regardless of
// the dollar rate), so a price change never retroactively devalues a purchase.
export const PRICING = {
  CREDITS_PER_DOLLAR: 5,
  CREDITS_PER_UNIT: 10,
  DOLLARS_PER_UNIT: 2,
  // Pay-as-you-go bounds (dollars). The floor is the entry price; the ceiling is a defensive
  // fat-finger/fraud guard, not a real limit on how much someone may buy.
  PAYG_MIN_DOLLARS: 5,
  PAYG_MAX_DOLLARS: 10000,
  // Packs never grant more than this bonus (the volume-incentive cap).
  MAX_BONUS_PCT: 0.3,
} as const;

// Credits granted for a dollar amount, optionally with a pack bonus. The single formula used by
// the webhook (what we actually grant), the buy UI (what we show), and the admin margin calculator,
// so all three can never disagree. floor() keeps grants integer for odd PAYG amounts.
export function creditsForDollars(dollars: number, bonusPct = 0): number {
  return Math.floor(dollars * PRICING.CREDITS_PER_DOLLAR * (1 + bonusPct));
}

// Pay-as-you-go is the base offer: buy any amount from PAYG_MIN_DOLLARS up, no pack needed. The
// packs below sit ON TOP purely as volume incentives — a bonus-credit % that grows with size,
// capped at MAX_BONUS_PCT. Prices are round; the incentive is extra credits, so copy says "extra
// credits", never "X% off" (a +30% bonus is only a ~23% effective per-unit discount).
const PACK_SPECS = [
  {
    id: "studio_pack",
    price: 100,
    bonusPct: 0.3,
    label: "Studio Pack",
    description: "For teams and heavy use",
    tagline: "30% extra credits",
    popular: false,
    features: ["Everything in the app", "Priority processing", "Credits never expire"],
  },
  {
    id: "pro_pack",
    price: 50,
    bonusPct: 0.2,
    label: "Pro Pack",
    description: "For regular use",
    tagline: "20% extra credits",
    popular: true,
    features: ["Everything in the app", "Priority processing", "Credits never expire"],
  },
  {
    id: "creator_pack",
    price: 20,
    bonusPct: 0.1,
    label: "Creator Pack",
    description: "To get going",
    tagline: "10% extra credits",
    popular: false,
    features: ["Everything in the app", "Credits never expire"],
  },
];

// Derived so display and grant stay locked to CREDITS_PER_DOLLAR. baseCredits = no bonus,
// bonusCredits = the extra, totalCredits = what the buyer receives, units = CREDITS_PER_UNIT each.
export const CREDIT_PACKS = PACK_SPECS.map((spec) => {
  const baseCredits = creditsForDollars(spec.price);
  const totalCredits = creditsForDollars(spec.price, spec.bonusPct);
  return {
    ...spec,
    baseCredits,
    bonusCredits: totalCredits - baseCredits,
    totalCredits,
    units: Math.floor(totalCredits / PRICING.CREDITS_PER_UNIT),
  };
});

export type CreditPack = (typeof CREDIT_PACKS)[number];

// NOTE: a new user's starting balance is FEATURES.credits.initialGrant (features.ts), not a
// constant here — it only applies when credits are enabled at all.

export function creditsToUnits(credits: number): number {
  return Math.floor(credits / PRICING.CREDITS_PER_UNIT);
}

export function unitsToCredits(units: number): number {
  return units * PRICING.CREDITS_PER_UNIT;
}
