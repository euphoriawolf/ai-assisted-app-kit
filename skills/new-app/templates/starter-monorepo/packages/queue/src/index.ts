import { drizzle } from "drizzle-orm/d1";
import { eq, sql } from "drizzle-orm";
import { items, credits, creditTransactions } from "@app/db";
import { JOB_MAX_ATTEMPTS, JOB_RETRY_BACKOFF_SECONDS, CREDIT_COSTS, FEATURES } from "@app/shared/constants";
import { ProviderError } from "@app/shared/errors";
import type { JobMessage } from "@app/shared/types";
import type { QueueEnv } from "./env.js";
import { handleStart } from "./handlers/start.js";
import { handleProcess } from "./handlers/process.js";
import { handleFinalize } from "./handlers/finalize.js";

export default {
  async queue(batch: MessageBatch<JobMessage>, env: QueueEnv): Promise<void> {
    // DLQ consumer — the fix for the silent-black-hole trap (a DLQ with no consumer drops jobs
    // that exhaust retries). Anything landing here is logged (alert here in a real app) and acked.
    if (batch.queue.endsWith("-dlq")) {
      for (const m of batch.messages) {
        console.error(JSON.stringify({ level: "error", message: "job dead-lettered", body: m.body }));
        m.ack();
      }
      return;
    }

    for (const message of batch.messages) {
      const msg = message.body;
      try {
        switch (msg.step) {
          case "start":
            await handleStart(env, msg);
            break;
          case "process":
            await handleProcess(env, msg);
            break;
          case "finalize":
            await handleFinalize(env, msg);
            break;
        }
        message.ack();
      } catch (err) {
        // A permanent failure won't self-resolve — fail fast instead of burning every retry. A
        // provider billing/out-of-credit error is permanent; classify it, don't retry it.
        const attempts = message.attempts; // 1-based delivery count
        const permanent = (err instanceof ProviderError && !err.retryable) || attempts >= JOB_MAX_ATTEMPTS;

        if (permanent) {
          await failItem(env, msg, err);
          message.ack(); // recorded + refunded; stop retrying
        } else {
          const delay = JOB_RETRY_BACKOFF_SECONDS[Math.min(attempts - 1, JOB_RETRY_BACKOFF_SECONDS.length - 1)]!;
          message.retry({ delaySeconds: delay });
        }
      }
    }
  },
};

// Mark the item failed and refund the credits charged at creation. Runs once (we ack after).
async function failItem(env: QueueEnv, msg: JobMessage, err: unknown): Promise<void> {
  const db = drizzle(env.DB);
  const message = err instanceof Error ? err.message : String(err);

  await db
    .update(items)
    .set({ status: "failed", errorMessage: message, updatedAt: new Date().toISOString() })
    .where(eq(items.id, msg.itemId));

  // Refund only if creation actually charged (credits + gating on).
  if (FEATURES.credits.enabled && FEATURES.credits.gateCreation) {
    await refundCredits(db, msg.userId, CREDIT_COSTS.CREATE_ITEM, msg.itemId);
  }
  console.error(JSON.stringify({ level: "error", message: "item failed permanently", itemId: msg.itemId, error: message }));
}

async function refundCredits(db: ReturnType<typeof drizzle>, userId: string, amount: number, itemId: string): Promise<void> {
  const now = new Date().toISOString();
  await db.batch([
    db
      .insert(credits)
      .values({ userId, balance: amount, updatedAt: now })
      .onConflictDoUpdate({ target: credits.userId, set: { balance: sql`${credits.balance} + ${amount}`, updatedAt: now } }),
    db.insert(creditTransactions).values({
      userId,
      amount,
      type: "refund",
      description: `Refund for failed item ${itemId}`,
      itemId,
      balanceAfter: sql`(SELECT balance FROM credits WHERE user_id = ${userId})`,
      createdAt: now,
    }),
  ]);
}
