import { defineMiddleware } from "astro:middleware";
import { getUser } from "@/lib/requireUser";
import { resolveApiBase } from "@/lib/apiBase";

// Routes that require a signed-in user. Everything else renders publicly.
const PROTECTED_PREFIX = "/dashboard";
// Sub-paths that additionally require an admin role.
const ADMIN_PREFIX = "/dashboard/admin";

export const onRequest = defineMiddleware(async (context, next) => {
  // If you serve the app on more than one hostname, 301 the duplicate to the canonical one HERE,
  // before any auth work — otherwise you pay for an SSR fetch on a request you are about to
  // redirect, and search engines index both hosts. Preserve path AND query. Example:
  //
  // if (!import.meta.env.DEV && context.url.hostname === "old.example.com") {
  //   return context.redirect(`https://example.com${context.url.pathname}${context.url.search}`, 301);
  // }

  if (!context.url.pathname.startsWith(PROTECTED_PREFIX)) return next();

  const user = await getUser(context.request, resolveApiBase(context));

  // Gate server-side. Without this the whole dashboard shell is server-rendered for logged-out
  // visitors and only disappears once client JS loads — a visible flash of an app they cannot use.
  if (!user) {
    const next_ = context.url.pathname + context.url.search;
    return context.redirect(`/login?next=${encodeURIComponent(next_)}`, 302);
  }

  context.locals.user = user;

  if (context.url.pathname.startsWith(ADMIN_PREFIX) && user.role !== "admin") {
    return context.redirect(PROTECTED_PREFIX, 302);
  }

  return next();
});
