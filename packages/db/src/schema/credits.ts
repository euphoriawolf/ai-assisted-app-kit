import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { users, organizations } from "./users.js";
import { items } from "./items.js";

export const credits = sqliteTable("credits", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  balance: integer("balance").notNull().default(0),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});

export const orgCredits = sqliteTable("org_credits", {
  orgId: text("org_id")
    .primaryKey()
    .references(() => organizations.id, { onDelete: "cascade" }),
  balance: integer("balance").notNull().default(0),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});

export const orders = sqliteTable("orders", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  orgId: text("org_id").references(() => organizations.id),
  provider: text("provider").notNull(),
  providerOrderId: text("provider_order_id").notNull().unique(),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("usd"),
  creditsGranted: integer("credits_granted").notNull(),
  status: text("status").notNull().default("completed"),
  metadata: text("metadata"), // JSON
  createdAt: text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});

export const creditTransactions = sqliteTable("credit_transactions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  amount: integer("amount").notNull(),
  type: text("type").notNull(),
  description: text("description"),
  itemId: text("item_id").references(() => items.id),
  orderId: text("order_id").references(() => orders.id),
  balanceAfter: integer("balance_after").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});

export const subscriptions = sqliteTable("subscriptions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  orgId: text("org_id").references(() => organizations.id),
  provider: text("provider").notNull(),
  providerSubscriptionId: text("provider_subscription_id").notNull().unique(),
  providerProductId: text("provider_product_id"),
  planName: text("plan_name"),
  status: text("status").notNull(),
  monthlyCredits: integer("monthly_credits").notNull().default(0),
  currentPeriodStart: text("current_period_start"),
  currentPeriodEnd: text("current_period_end"),
  canceledAt: text("canceled_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});

export const redemptionCodes = sqliteTable("redemption_codes", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  code: text("code").notNull().unique(),
  credits: integer("credits").notNull(),
  packageType: text("package_type").notNull().default("generic"),
  redeemedBy: text("redeemed_by").references(() => users.id),
  redeemedAt: text("redeemed_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});
