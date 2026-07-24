export type CreditTransactionType =
  | "initial"
  | "purchase"
  | "usage"
  | "reservation"
  | "refund"
  | "admin_grant"
  | "admin_deduct"
  | "redemption"
  | "subscription";

export interface Credits {
  userId: string;
  balance: number;
  updatedAt: string;
}

export interface OrgCredits {
  orgId: string;
  balance: number;
  updatedAt: string;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  type: CreditTransactionType;
  description: string | null;
  itemId: string | null;
  orderId: string | null;
  balanceAfter: number;
  createdAt: string;
}

export interface Order {
  id: string;
  userId: string;
  orgId: string | null;
  provider: string;
  providerOrderId: string;
  amountCents: number;
  currency: string;
  creditsGranted: number;
  status: "pending" | "completed" | "refunded";
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  orgId: string | null;
  provider: string;
  providerSubscriptionId: string;
  providerProductId: string | null;
  planName: string | null;
  status: "active" | "canceled" | "revoked" | "past_due";
  monthlyCredits: number;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RedemptionCode {
  id: string;
  code: string;
  credits: number;
  packageType: string;
  redeemedBy: string | null;
  redeemedAt: string | null;
  createdAt: string;
}
