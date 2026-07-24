export interface ApiKey {
  id: string;
  userId: string;
  orgId: string | null;
  keyPrefix: string;
  name: string;
  isActive: boolean;
  lastUsedAt: string | null;
  usageCount: number;
  createdAt: string;
  revokedAt: string | null;
}

// Standard API response wrappers
export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// Pagination
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  hasMore: boolean;
}
