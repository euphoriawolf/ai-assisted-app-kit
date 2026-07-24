import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { users, organizations } from "./users.js";

// The example domain object. Rename to your real core object and add its fields. `status` +
// `progress` drive the dashboard and the async job pipeline (see packages/queue).
export const items = sqliteTable("items", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  orgId: text("org_id").references(() => organizations.id),
  title: text("title").notNull(),
  status: text("status").notNull().default("pending"),
  progress: integer("progress").notNull().default(0),
  progressMessage: text("progress_message"),
  // R2 key of the produced artifact — store the key, never a full URL.
  resultKey: text("result_key"),
  errorMessage: text("error_message"),
  metadata: text("metadata"), // JSON string
  createdAt: text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});
