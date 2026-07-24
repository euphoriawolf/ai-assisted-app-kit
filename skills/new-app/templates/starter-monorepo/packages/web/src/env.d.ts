/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Set by src/middleware.ts on protected routes, so pages under /dashboard can read
// `Astro.locals.user` with no null branch.
declare namespace App {
  interface Locals {
    user?: import("./lib/api").Me;
  }
}
