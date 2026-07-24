export interface Env {
  // D1 Database
  DB: D1Database;

  // R2 Bucket (user artifacts). Store keys in D1, generate URLs on demand.
  FILES: R2Bucket;

  // KV Namespaces
  SESSION_CACHE: KVNamespace;
  RATE_LIMIT: KVNamespace;

  // Queue (async job pipeline). Producer binding; the consumer lives in packages/queue.
  JOB_QUEUE: Queue;

  // Analytics Engine (event-based; not business data)
  ANALYTICS: AnalyticsEngineDataset;

  // Email (Cloudflare Email Sending)
  EMAIL: SendEmail;

  // Static assets (Astro web build) — bound in prod so the Worker can serve the SPA.
  ASSETS?: Fetcher;

  // Secrets (from .dev.vars locally or `wrangler secret put` in prod)
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  AUTH_SECRET: string;
  POLAR_API_KEY: string;
  POLAR_WEBHOOK_SECRET: string;
  // Polar product ids — custom-priced PAYG + fixed-price packs. Optional so checkout returns a
  // clean 503 (not a mischarge) when an id isn't wired yet. See CLAUDE.md Credit System.
  POLAR_PRODUCT_PAYG?: string;
  POLAR_PRODUCT_CREATOR?: string;
  POLAR_PRODUCT_PRO?: string;
  POLAR_PRODUCT_STUDIO?: string;

  // Config vars
  EMAIL_FROM: string;
  SLACK_WEBHOOK_URL?: string;
  APP_URL: string;
  FRONTEND_URL: string;
  // Set in prod (e.g. ".example.com") so the session cookie is shared across the api. and app.
  // subdomains. Leave unset in local dev for a host-only cookie.
  COOKIE_DOMAIN?: string;
  ENVIRONMENT: "development" | "staging" | "production";
  ADMIN_EMAILS: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
}

// Typed context variables set by middleware
export interface Variables {
  requestId: string;
  userId: string;
  userEmail: string;
  userRole: string;
  apiKeyId: string;
}
