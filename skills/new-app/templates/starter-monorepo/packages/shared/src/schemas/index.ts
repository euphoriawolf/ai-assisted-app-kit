import { z } from "zod";

// Auth
export const MagicLinkRequestSchema = z.object({
  email: z.string().email(),
  next: z.string().optional(),
});

// Items — the example domain resource. Rename/extend for your core object.
export const CreateItemSchema = z.object({
  title: z.string().min(1).max(200),
  orgId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// Credits
export const RedeemCodeSchema = z.object({
  code: z.string().min(1).max(100).toUpperCase(),
});

// Admin
export const AdminCreditAdjustSchema = z.object({
  userId: z.string(),
  amount: z.number().int(),
  description: z.string().min(1),
});

// API Keys
export const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(100).default("Default API Key"),
  orgId: z.string().uuid().optional(),
});

// Share
export const CreateShareSchema = z.object({
  itemId: z.string().uuid(),
  customTitle: z.string().max(200).optional(),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

// Pagination
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});

// Org
export const CreateOrgSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
});

export const InviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member"]).default("member"),
});
