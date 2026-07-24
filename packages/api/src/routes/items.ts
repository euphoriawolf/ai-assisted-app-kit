import { Hono } from "hono";
import type { Env, Variables } from "../bindings.js";
import { authMiddleware } from "../middleware/auth.js";
import { sessionRateLimitMiddleware } from "../middleware/rate-limit.js";
import { CreateItemSchema, PaginationSchema } from "@app/shared/schemas";
import { CREDIT_COSTS, FEATURES } from "@app/shared/constants";
import type { JobMessage } from "@app/shared/types";
import { deductCredits } from "../services/credit.service.js";
import { NotFoundError } from "@app/shared/errors";
import { drizzle } from "drizzle-orm/d1";
import { eq, and, desc, sql } from "drizzle-orm";
import { items } from "@app/db";

const itemRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// POST /api/v1/items — create an item, charge credits, enqueue the async job.
// This is the worked example of the queue-producer + provider seam. The queue consumer
// (packages/queue) advances start -> process -> finalize and refunds if it permanently fails.
itemRoutes.post("/", authMiddleware, sessionRateLimitMiddleware("create-item", 20), async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json().catch(() => ({}));
  const { title, orgId, metadata } = CreateItemSchema.parse(body);

  const db = drizzle(c.env.DB);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // Credits are OPTIONAL. By default the core loop is free — nothing to pay, no 402. Only when a
  // developer turns on metering does creation charge (and the queue refunds on permanent failure).
  if (FEATURES.credits.enabled && FEATURES.credits.gateCreation) {
    await deductCredits(db, userId, CREDIT_COSTS.CREATE_ITEM, "usage", `Create item: ${title}`, id);
  }

  await db.insert(items).values({
    id,
    userId,
    orgId: orgId ?? null,
    title,
    status: "pending",
    progress: 0,
    metadata: metadata ? JSON.stringify(metadata) : null,
    createdAt: now,
    updatedAt: now,
  });

  const msg: JobMessage = { step: "start", itemId: id, userId };
  await c.env.JOB_QUEUE.send(msg);

  return c.json({ ok: true, data: { id, status: "pending" } }, 201);
});

// GET /api/v1/items — list (paginated), newest first. Reads D1 only.
itemRoutes.get("/", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const { page, perPage } = PaginationSchema.parse({ page: c.req.query("page"), perPage: c.req.query("perPage") });
  const db = drizzle(c.env.DB);
  const offset = (page - 1) * perPage;

  const [rows, [countRow]] = await Promise.all([
    db.select().from(items).where(eq(items.userId, userId)).orderBy(desc(items.createdAt)).limit(perPage).offset(offset),
    db.select({ total: sql<number>`count(*)` }).from(items).where(eq(items.userId, userId)),
  ]);
  const total = countRow?.total ?? 0;
  return c.json({ ok: true, data: { items: rows, total, page, perPage, hasMore: offset + rows.length < total } });
});

// GET /api/v1/items/:id — read from D1 only (the API never calls providers on reads).
itemRoutes.get("/:id", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const db = drizzle(c.env.DB);
  const [row] = await db
    .select()
    .from(items)
    .where(and(eq(items.id, c.req.param("id")!), eq(items.userId, userId)))
    .limit(1);
  if (!row) throw new NotFoundError("Item");
  return c.json({ ok: true, data: row });
});

// DELETE /api/v1/items/:id
itemRoutes.delete("/:id", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const db = drizzle(c.env.DB);
  await db.delete(items).where(and(eq(items.id, c.req.param("id")!), eq(items.userId, userId)));
  return c.json({ ok: true });
});

export { itemRoutes };
