import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { items } from "@app/db";
import { JOB_PROGRESS } from "@app/shared/constants";
import type { JobMessage } from "@app/shared/types";
import type { QueueEnv } from "../env.js";

export async function handleStart(env: QueueEnv, msg: JobMessage): Promise<void> {
  const db = drizzle(env.DB);
  const p = JOB_PROGRESS.start;
  // Update visible status at the START of the step, so a stuck job shows the real step (gotcha).
  await db
    .update(items)
    .set({ status: "processing", progress: p.progress, progressMessage: p.message, updatedAt: new Date().toISOString() })
    .where(eq(items.id, msg.itemId));

  await env.JOB_QUEUE.send({ step: "process", itemId: msg.itemId, userId: msg.userId } satisfies JobMessage);
}
