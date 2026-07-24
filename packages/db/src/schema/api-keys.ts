import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { users, organizations } from "./users.js";

export const apiKeys = sqliteTable("api_keys", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  keyHash: text("key_hash").notNull().unique(),
  keyPrefix: text("key_prefix").notNull(),
  name: text("name").notNull().default("Default API Key"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  lastUsedAt: text("last_used_at"),
  usageCount: integer("usage_count").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  revokedAt: text("revoked_at"),
});
