import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { items } from "@app/db";
import type { JobMessage } from "@app/shared/types";
import type { QueueEnv } from "../env.js";

export async function handleFinalize(env: QueueEnv, msg: JobMessage): Promise<void> {
  const db = drizzle(env.DB);
  await db
    .update(items)
    .set({ status: "done", progress: 100, progressMessage: "Done", updatedAt: new Date().toISOString() })
    .where(eq(items.id, msg.itemId));

  // This is where you'd send a completion email or fire the item's webhook. Best-effort — never
  // throw here, or a delivered result gets marked failed on a mail hiccup.
}
