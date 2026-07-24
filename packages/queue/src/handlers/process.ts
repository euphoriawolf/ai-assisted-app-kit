import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { items } from "@app/db";
import { JOB_PROGRESS } from "@app/shared/constants";
import type { JobMessage } from "@app/shared/types";
import type { QueueEnv } from "../env.js";
import { processItem } from "../processor.js";

export async function handleProcess(env: QueueEnv, msg: JobMessage): Promise<void> {
  const db = drizzle(env.DB);
  const [item] = await db.select().from(items).where(eq(items.id, msg.itemId)).limit(1);
  if (!item) return; // deleted mid-flight — nothing to do

  const p = JOB_PROGRESS.process;
  await db
    .update(items)
    .set({ progress: p.progress, progressMessage: p.message, updatedAt: new Date().toISOString() })
    .where(eq(items.id, msg.itemId));

  const result = await processItem({
    itemId: item.id,
    title: item.title,
    metadata: item.metadata ? (JSON.parse(item.metadata) as Record<string, unknown>) : null,
  });

  // Store the artifact in R2; persist only the KEY in D1 (never a full URL).
  const key = `${item.id}/result.${result.extension}`;
  await env.FILES.put(key, result.data, { httpMetadata: { contentType: result.contentType } });
  await db.update(items).set({ resultKey: key, updatedAt: new Date().toISOString() }).where(eq(items.id, msg.itemId));

  await env.JOB_QUEUE.send({ step: "finalize", itemId: msg.itemId, userId: msg.userId } satisfies JobMessage);
}
