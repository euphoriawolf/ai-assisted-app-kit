import { drizzle } from "drizzle-orm/d1";
import { eq, desc, sql } from "drizzle-orm";
import { credits, creditTransactions, redemptionCodes } from "@app/db";
import type { CreditTransactionType } from "@app/shared/types";
import { InsufficientCreditsError } from "@app/shared/errors";

type DB = ReturnType<typeof drizzle>;

// ---------- Balance ----------

export async function getCredits(db: DB, userId: string) {
  const [row] = await db.select({ balance: credits.balance }).from(credits).where(eq(credits.userId, userId)).limit(1);
  if (!row) return null;
  return { balance: row.balance };
}

// ---------- Deduct credits (atomic, prevents going negative) ----------

export async function deductCredits(
  db: DB,
  userId: string,
  amount: number,
  type: CreditTransactionType,
  description: string,
  itemId?: string,
): Promise<number> {
  const now = new Date().toISOString();

  // Atomic conditional UPDATE — changes=0 means insufficient balance.
  const result = await db.run(
    sql`UPDATE credits SET balance = balance - ${amount}, updated_at = ${now}
        WHERE user_id = ${userId} AND balance >= ${amount}`,
  );

  if ((result.meta.changes ?? 0) === 0) {
    const [row] = await db.select({ balance: credits.balance }).from(credits).where(eq(credits.userId, userId)).limit(1);
    throw new InsufficientCreditsError(amount, row?.balance ?? 0);
  }

  const [updated] = await db.select({ balance: credits.balance }).from(credits).where(eq(credits.userId, userId)).limit(1);
  const newBalance = updated?.balance ?? 0;

  await db.insert(creditTransactions).values({
    userId,
    amount: -amount,
    type,
    description,
    itemId: itemId ?? null,
    balanceAfter: newBalance,
  });

  return newBalance;
}

// ---------- Add credits (atomic upsert + ledger row in one transaction) ----------

export async function addCredits(
  db: DB,
  userId: string,
  amount: number,
  type: CreditTransactionType,
  description: string,
  orderId?: string,
): Promise<number> {
  const now = new Date().toISOString();
  const txId = crypto.randomUUID();

  await db.batch([
    db
      .insert(credits)
      .values({ userId, balance: amount, updatedAt: now })
      .onConflictDoUpdate({
        target: credits.userId,
        set: { balance: sql`${credits.balance} + ${amount}`, updatedAt: now },
      }),
    db.insert(creditTransactions).values({
      id: txId,
      userId,
      amount,
      type,
      description,
      orderId: orderId ?? null,
      balanceAfter: sql`(SELECT balance FROM credits WHERE user_id = ${userId})`,
      createdAt: now,
    }),
  ]);

  const [updated] = await db.select({ balance: credits.balance }).from(credits).where(eq(credits.userId, userId)).limit(1);
  return updated?.balance ?? 0;
}

// ---------- Transactions ----------

export async function getTransactions(db: DB, userId: string, page: number, perPage: number) {
  const offset = (page - 1) * perPage;

  const [items, [countRow]] = await Promise.all([
    db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(perPage)
      .offset(offset),
    db.select({ total: sql<number>`count(*)` }).from(creditTransactions).where(eq(creditTransactions.userId, userId)),
  ]);

  const total = countRow?.total ?? 0;
  return { items, total, page, perPage, hasMore: offset + items.length < total };
}

// ---------- Promo code redemption ----------

export async function redeemCode(db: DB, userId: string, code: string): Promise<{ credits: number }> {
  const now = new Date().toISOString();
  const normalised = code.toUpperCase().trim();

  const [redemption] = await db.select().from(redemptionCodes).where(eq(redemptionCodes.code, normalised)).limit(1);
  if (!redemption) throw new Error("Invalid code");
  if (redemption.redeemedAt) throw new Error("Code already used");

  // Atomic mark-as-redeemed prevents double-use races.
  const result = await db.run(
    sql`UPDATE redemption_codes SET redeemed_by = ${userId}, redeemed_at = ${now}
        WHERE code = ${normalised} AND redeemed_at IS NULL`,
  );
  if ((result.meta.changes ?? 0) === 0) throw new Error("Code already used");

  await addCredits(db, userId, redemption.credits, "redemption", `Redeemed code: ${normalised}`);
  return { credits: redemption.credits };
}
