export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class AuthError extends AppError {
  constructor(message = "Unauthorized") {
    super("UNAUTHORIZED", message, 401);
    this.name = "AuthError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super("FORBIDDEN", message, 403);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super("NOT_FOUND", `${resource} not found`, 404);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super("VALIDATION_ERROR", message, 422, details);
    this.name = "ValidationError";
  }
}

export class InsufficientCreditsError extends AppError {
  constructor(required: number, available?: number) {
    super(
      "INSUFFICIENT_CREDITS",
      available !== undefined
        ? `Insufficient credits: ${required} required, ${available} available`
        : `Insufficient credits: ${required} required`,
      402,
      { required, available },
    );
    this.name = "InsufficientCreditsError";
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Rate limit exceeded") {
    super("RATE_LIMITED", message, 429);
    this.name = "RateLimitError";
  }
}

// Failure category used to drive retry strategy + user-facing copy:
// - "overloaded": provider busy / rate-limited / out of credits (5xx, 429, 402/403)
// - "bad_input": provider rejected the input (other 4xx, e.g. 422 invalid_request)
// - "unknown": anything unclassified
export type ProviderFailureCategory = "overloaded" | "bad_input" | "unknown";

export class ProviderError extends AppError {
  // retryable=false signals a permanent failure (e.g. upstream 4xx / bad input) so the
  // queue can fail fast instead of burning all 3 delivery attempts. Defaults to true.
  public readonly retryable: boolean;
  public readonly category: ProviderFailureCategory;
  constructor(
    provider: string,
    message: string,
    options?: { retryable?: boolean; details?: unknown; category?: ProviderFailureCategory },
  ) {
    super("PROVIDER_ERROR", `${provider}: ${message}`, 502, options?.details);
    this.name = "ProviderError";
    this.retryable = options?.retryable ?? true;
    this.category = options?.category ?? "unknown";
  }

  // Classify an upstream HTTP status into a ProviderError with the right
  // retry/category semantics. Centralizes the "smart split" policy.
  static fromStatus(
    provider: string,
    status: number,
    body?: string,
  ): ProviderError {
    const detail = body ? ` — ${body}` : "";
    // Out of credits / billing / forbidden — won't self-resolve; fail fast + ops alert.
    if (status === 402 || status === 403) {
      return new ProviderError(provider, `Upstream ${status} (out of credits / billing)${detail}`, {
        retryable: false,
        category: "overloaded",
      });
    }
    // Transient overload — retry with backoff.
    if (status === 408 || status === 409 || status === 425 || status === 429 || status >= 500) {
      return new ProviderError(provider, `Upstream ${status} (temporary)${detail}`, {
        retryable: true,
        category: "overloaded",
      });
    }
    // Other 4xx (incl. 422 invalid_request) — bad input; fail fast.
    if (status >= 400) {
      return new ProviderError(provider, `Upstream ${status} (invalid request)${detail}`, {
        retryable: false,
        category: "bad_input",
      });
    }
    return new ProviderError(provider, `Upstream ${status}${detail}`);
  }
}
