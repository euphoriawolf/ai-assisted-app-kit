import type { Context, Next } from "hono";
import type { Env, Variables } from "../bindings.js";

type HonoCtx = Context<{ Bindings: Env; Variables: Variables }>;

export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
  requestId: string;
  level: LogLevel;
  method?: string;
  path?: string;
  status?: number;
  durationMs?: number;
  userId?: string;
  message: string;
  error?: string;
  [key: string]: unknown;
}

export function log(c: HonoCtx, level: LogLevel, message: string, extra: Record<string, unknown> = {}): void {
  const entry = {
    requestId: c.get("requestId") ?? "unknown",
    userId: c.get("userId"),
    level,
    message,
    ...extra,
  };
  const output = JSON.stringify(entry);
  if (level === "error") console.error(output);
  else if (level === "warn") console.warn(output);
  else console.log(output);
}

export async function loggerMiddleware(c: HonoCtx, next: Next): Promise<void> {
  const requestId = crypto.randomUUID();
  c.set("requestId", requestId);
  c.res.headers.set("x-request-id", requestId);

  const start = Date.now();
  await next();

  const durationMs = Date.now() - start;
  const entry = {
    requestId,
    level: "info" as LogLevel,
    method: c.req.method,
    path: new URL(c.req.url).pathname,
    status: c.res.status,
    durationMs,
    userId: c.get("userId"),
    message: `${c.req.method} ${new URL(c.req.url).pathname} ${c.res.status} ${durationMs}ms`,
  };
  console.log(JSON.stringify(entry));
}
