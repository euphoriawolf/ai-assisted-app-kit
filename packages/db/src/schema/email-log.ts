import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { users } from "./users.js";

// One row per lifecycle/marketing email actually sent — used to dedupe one-time sends (never send
// "activation" twice) and enforce cooldowns (e.g. "winback" at most once per 30 days).
// Transactional email (magic link, purchase confirmation, job complete) is NOT logged here; those
// always send regardless of opt-out.
export const emailLog = sqliteTable(
  "email_log",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // "welcome_followup" | "activation" | "winback"
    sentAt: text("sent_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => [index("email_log_user_type_idx").on(table.userId, table.type)],
);
