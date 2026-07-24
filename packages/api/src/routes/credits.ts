import { Hono } from "hono";
import type { Env, Variables } from "../bindings.js";
import { authMiddleware } from "../middleware/auth.js";
import { getCredits, getTransactions, redeemCode } from "../services/credit.service.js";
import { CREDIT_PACKS, PRICING } from "@app/shared/constants";
import { PaginationSchema, RedeemCodeSchema } from "@app/shared/schemas";
import { drizzle } from "drizzle-orm/d1";

const creditRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /api/v1/credits — current balance
creditRoutes.get("/", authMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const bal = await getCredits(db, c.get("userId"));
  return c.json({ ok: true, data: { balance: bal?.balance ?? 0 } });
});

// GET /api/v1/credits/packs — the buy options (derived from CREDITS_PER_DOLLAR)
creditRoutes.get("/packs", (c) =>
  c.json({
    ok: true,
    data: {
      packs: CREDIT_PACKS,
      payg: {
        min: PRICING.PAYG_MIN_DOLLARS,
        max: PRICING.PAYG_MAX_DOLLARS,
        creditsPerDollar: PRICING.CREDITS_PER_DOLLAR,
      },
    },
  }),
);

// GET /api/v1/credits/transactions — ledger (paginated)
creditRoutes.get("/transactions", authMiddleware, async (c) => {
  const { page, perPage } = PaginationSchema.parse({ page: c.req.query("page"), perPage: c.req.query("perPage") });
  const db = drizzle(c.env.DB);
  const result = await getTransactions(db, c.get("userId"), page, perPage);
  return c.json({ ok: true, data: result });
});

// POST /api/v1/credits/redeem — redeem a promo code
creditRoutes.post("/redeem", authMiddleware, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { code } = RedeemCodeSchema.parse(body);
  const db = drizzle(c.env.DB);
  const result = await redeemCode(db, c.get("userId"), code);
  return c.json({ ok: true, data: result });
});

export { creditRoutes };
