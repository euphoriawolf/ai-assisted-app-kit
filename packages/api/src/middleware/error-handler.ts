import type { Context } from "hono";
import type { Env, Variables } from "../bindings.js";
import { AppError } from "@app/shared/errors";
import { ZodError } from "zod";

export function errorHandler(err: Error, c: Context<{ Bindings: Env; Variables: Variables }>) {
  const requestId = c.get("requestId") ?? "unknown";

  if (err instanceof AppError) {
    return c.json(
      {
        ok: false,
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
        },
      },
      err.statusCode as 400 | 401 | 402 | 403 | 404 | 422 | 429 | 502,
    );
  }

  if (err instanceof ZodError) {
    return c.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request",
          details: err.flatten().fieldErrors,
        },
      },
      422,
    );
  }

  console.error(
    JSON.stringify({
      requestId,
      level: "error",
      message: err.message,
      error: err.stack,
    }),
  );

  return c.json(
    {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    },
    500,
  );
}
